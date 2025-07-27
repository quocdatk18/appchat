import { io, Socket } from 'socket.io-client';

const URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const socket: Socket = io(URL, {
  transports: ['websocket'], // ưu tiên websocket thay vì polling
  withCredentials: true, // nếu backend cần cookie
  autoConnect: false, // để chủ động connect sau khi có user
});

export default socket;
