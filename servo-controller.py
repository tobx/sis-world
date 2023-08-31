#!/usr/bin/env python3

import argparse
from contextlib import contextmanager
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer
import os
import ssl
import sys
import time
from urllib.parse import parse_qs, urlparse


debug_gpio = False

try:
    import pigpio
except ImportError as error:
    print(f"Enabling GPIO debug mode, because module '{error.name}' is missing.")
    debug_gpio = True

# Utilities


def error(message):
    print("Error:", message)


def fileno(file_or_fd):
    fd = getattr(file_or_fd, "fileno", lambda: file_or_fd)()
    if not isinstance(fd, int):
        raise ValueError("Expected a file (`.fileno()`) or a file descriptor")
    return fd


# https://stackoverflow.com/questions/4675728/redirect-stdout-to-a-file-in-python/22434262#22434262
@contextmanager
def stdout_redirected(to=os.devnull, stdout=None):
    if stdout is None:
        stdout = sys.stdout

    stdout_fd = fileno(stdout)
    with os.fdopen(os.dup(stdout_fd), "wb") as copied:
        stdout.flush()
        try:
            os.dup2(fileno(to), stdout_fd)
        except ValueError:
            with open(to, "wb") as to_file:
                os.dup2(to_file.fileno(), stdout_fd)
        try:
            yield stdout
        finally:
            stdout.flush()
            os.dup2(copied.fileno(), stdout_fd)


# https://stackoverflow.com/questions/4675728/redirect-stdout-to-a-file-in-python/22434262#22434262
def merged_stderr_stdout():
    return stdout_redirected(to=sys.stdout, stdout=sys.stderr)


# Web server


access_control_allow_origin = None


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(HTTPStatus.OK)
        if not access_control_allow_origin is None:
            self.send_header("Access-Control-Allow-Origin", access_control_allow_origin)
        self.end_headers()
        info = urlparse(self.path)
        if info.path != "/":
            error(f"invalid request path '{info.path}'")
            return
        query = parse_qs(info.query)
        if not query:
            return
        if not "servo" in query:
            error("request is missing a parameter with name 'servo'")
            return
        servo_name = query.get("servo")[0]
        if not "move" in query:
            error("request is missing a parameter with name 'move'")
            return
        try:
            servo_position = float(query.get("move")[0])
        except ValueError:
            error("value of request parameter 'move' must be a number")
            return
        if servo_position < 0 or servo_position > 1:
            error(
                "value of request parameter 'move' must be a number in the range [0, 1]."
            )
            return
        move_servo(servo_name, servo_position)

    def log_message(self, format, *args):
        pass


def start_http_server(host, port, cors, ssl_key_path, ssl_cert_path):
    global access_control_allow_origin
    access_control_allow_origin = cors
    httpd = HTTPServer((host, port), Handler)
    protocol = "http"
    if not ssl_key_path is None and not ssl_cert_path is None:
        httpd.socket = ssl.wrap_socket(
            httpd.socket,
            keyfile=ssl_key_path,
            certfile=ssl_cert_path,
            server_side=True,
        )
        protocol += "s"
    print(f"Listening on: {protocol}://{host}:{port}")
    httpd.serve_forever()


# Servo

pwm = None
servos = {}


class PigpioConnectionError(Exception):
    pass


def init_servos(config={}):
    global servos
    for name, pin_str in config.items():
        try:
            pin = int(pin_str)
        except ValueError:
            error(f"GPIO pin '{pin_str}' is not an integer.")
            sys.exit(1)
        if pin < 1:
            error(f"GPIO pins must be positive integers.")
            sys.exit(1)
        servos[name] = pin

    if debug_gpio:
        return

    global pwm
    with stdout_redirected(to=os.devnull), merged_stderr_stdout():
        pwm = pigpio.pi()
    if not pwm.connected:
        raise PigpioConnectionError

    for pin in servos.values():
        pwm.set_mode(pin, pigpio.OUTPUT)
        pwm.set_PWM_frequency(pin, 50)


def move_servo(name, position):
    if not name in servos:
        error(f"servo with name '{name}' does not exist")
        return

    pin = servos[name]

    log_message = f"Rotate servo motor on pin {pin} to angle {position * 180} degrees ..."

    if debug_gpio:
        print(f"Debug: {log_message}")
        return

    print(log_message)

    # set servo pulse width between 500 and 2500 (e.g. for a Tower Pro SG92R servo)
    pwm.set_servo_pulsewidth(pin, 500 + 2000 * position)

    time.sleep(1)


def clean_up_servos():
    if debug_gpio:
        return

    for pin in servos.values():
        pwm.set_PWM_dutycycle(pin, 0)
        pwm.set_mode(pin, pigpio.INPUT)
    pwm.stop()


# Command-line interface


class StoreDictKeyPair(argparse.Action):
    def __init__(self, option_strings, dest, nargs=None, **kwargs):
        self._nargs = nargs
        super(StoreDictKeyPair, self).__init__(
            option_strings, dest, nargs=nargs, **kwargs
        )

    def __call__(self, parser, namespace, values, option_string=None):
        dict = {}
        for kv in values:
            key, value = kv.split("=", 2)
            dict[key] = value
        setattr(namespace, self.dest, dict)


def parse_args():
    parser = argparse.ArgumentParser(description="Servo web controller")
    parser.add_argument(
        "--cors",
        help="set access-control-allow-origin header value",
    )
    parser.add_argument(
        "--ssl-key",
        metavar="PATH",
        help="set SSL key file path",
    )
    parser.add_argument(
        "--ssl-cert",
        metavar="PATH",
        help="set SSL cert file path",
    )
    parser.add_argument(
        "--servos",
        metavar="NAME=PIN",
        nargs="+",
        action=StoreDictKeyPair,
        help="set name and GPIO pin for servo motor",
    )
    parser.add_argument(
        "--move-servo",
        metavar="PIN=POSITION",
        help="move servo motor on pin PIN to position POSITION",
    )
    parser.add_argument(
        "--listen",
        metavar="ADDRESS",
        default="localhost",
        help="set IP address on which the server listens",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=1234,
        help="set port on which the server listens",
    )
    return parser.parse_args()


# Main


def main():
    args = parse_args()
    if args.move_servo is None:
        init_servos(args.servos)
        start_http_server(
            args.listen, args.port, args.cors, args.ssl_key, args.ssl_cert
        )
    else:
        pin, position = args.move_servo.split("=", 2)
        init_servos({"cli": int(pin)})
        input_error = False
        try:
            servo_position = float(position)
            if servo_position < 0 or servo_position > 1:
                error("position value must be a number in the range [0, 1].")
                input_error = True
        except ValueError:
            error("position value must be a number")
            input_error = True
        if input_error:
            clean_up_servos()
            sys.exit(1)
        else:
            move_servo("cli", float(position))


try:
    main()
    clean_up_servos()
except KeyboardInterrupt:
    clean_up_servos()
    print()
except PigpioConnectionError:
    error("cannot connect to pigpio")
    sys.exit(1)
