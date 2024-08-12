import socket
from open_file_pb2 import OpenFileCommand

def send_open_file_command(file_path):
    command = OpenFileCommand()
    command.file_path = file_path

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect(('localhost', 8888))
        s.sendall(command.SerializeToString())

send_open_file_command('/home/credzba/Projects/temp/test/test.py')
