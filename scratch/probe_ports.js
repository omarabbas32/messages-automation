import net from 'net';

const checkPort = (port) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 1000;
        
        socket.setTimeout(timeout);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });
        
        socket.connect(port, '127.0.0.1');
    });
};

const main = async () => {
    const ports = [5432, 5433, 5434, 5435];
    console.log('🔍 Probing local PostgreSQL ports...');
    for (const port of ports) {
        const isOpen = await checkPort(port);
        console.log(`Port ${port}: ${isOpen ? 'OPEN ✅' : 'CLOSED ❌'}`);
    }
};

main();
