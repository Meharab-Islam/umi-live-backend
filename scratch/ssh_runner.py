import pty
import os
import select
import sys
import time

def run_ssh_command(remote_cmd, timeout=300):
    pid, fd = pty.fork()
    if pid == 0:
        os.environ['TERM'] = 'dumb'
        os.execvp('ssh', [
            'ssh',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'PubkeyAuthentication=no',
            '-o', 'PreferredAuthentications=password',
            '-o', 'ConnectTimeout=10',
            '-o', 'ServerAliveInterval=5',
            'root@107.174.137.29',
            remote_cmd
        ])
    else:
        output = []
        sent_pass = False
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            r, _, _ = select.select([fd], [], [], 0.5)
            if fd in r:
                try:
                    chunk = os.read(fd, 4096)
                    if not chunk:
                        break
                    output.append(chunk)
                    text = b''.join(output).decode('utf-8', errors='ignore')
                    if not sent_pass and 'password:' in text.lower():
                        os.write(fd, b'entFSxPXazSN\n')
                        sent_pass = True
                except OSError:
                    break
        
        try:
            os.close(fd)
        except OSError:
            pass
        try:
            os.waitpid(pid, 0)
        except OSError:
            pass
            
        full_text = b''.join(output).decode('utf-8', errors='ignore')
        # Filter out password prompt
        lines = full_text.splitlines()
        clean_lines = [l for l in lines if 'password:' not in l.lower()]
        return '\n'.join(clean_lines)

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'docker ps'
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    print(run_ssh_command(cmd, timeout=timeout))
