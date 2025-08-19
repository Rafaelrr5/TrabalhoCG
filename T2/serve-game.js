const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;

// Mapeamento de extensões para tipos MIME
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.obj': 'text/plain',
    '.mtl': 'text/plain',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg'
};

// Pastas onde procurar arquivos (em ordem de prioridade)
const searchPaths = [
    __dirname,                    // T2/
    path.join(__dirname, '..'),  // TrabalhoCG/
    path.join(__dirname, '../libs'),  // libs/
    path.join(__dirname, '../html'),  // html/
    path.join(__dirname, '../assets'), // assets/
    path.join(__dirname, '../0_assetsT3'), // 0_assetsT3/
];

// Função para encontrar arquivo em múltiplas pastas
function findFile(filename) {
    for (const searchPath of searchPaths) {
        const filePath = path.join(searchPath, filename);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return null;
}

const server = http.createServer((req, res) => {
    // Parse da URL
    const parsedUrl = url.parse(req.url);
    let pathname = parsedUrl.pathname;
    
    // Rota padrão para index.html
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // Remover barra inicial se existir
    if (pathname.startsWith('/')) {
        pathname = pathname.substring(1);
    }
    
    // Tentar encontrar o arquivo
    const filePath = findFile(pathname);
    
    if (!filePath) {
        // Arquivo não encontrado - mostrar informações de debug
        console.log(`❌ Arquivo não encontrado: ${pathname}`);
        console.log('🔍 Pastas pesquisadas:');
        searchPaths.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
        
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
                <head><title>404 - Arquivo não encontrado</title></head>
                <body>
                    <h1>404 - Arquivo não encontrado</h1>
                    <p>O arquivo <code>${pathname}</code> não foi encontrado.</p>
                    <p>Pastas pesquisadas:</p>
                    <ul>
                        ${searchPaths.map(p => `<li><code>${p}</code></li>`).join('')}
                    </ul>
                    <hr>
                    <p><em>Servidor do Jogo Trabalho CG</em></p>
                </body>
            </html>
        `);
        return;
    }
    
    // Ler o arquivo
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error(`❌ Erro ao ler arquivo: ${filePath}`, err);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <head><title>500 - Erro interno</title></head>
                    <body>
                        <h1>500 - Erro interno do servidor</h1>
                        <p>Erro ao ler o arquivo: ${err.message}</p>
                        <p>Caminho: ${filePath}</p>
                        <hr>
                        <p><em>Servidor do Jogo Trabalho CG</em></p>
                    </body>
                </html>
            `);
            return;
        }
        
        // Determinar tipo MIME
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        // Configurar headers CORS
        res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        
        // Log de sucesso
        console.log(`✅ ${req.method} ${pathname} -> ${filePath}`);
        
        // Enviar arquivo
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('🎮 SERVIDOR DO JOGO INICIADO!');
    console.log('================================');
    console.log(`🌐 URL Local: http://localhost:${PORT}`);
    console.log(`🌐 URL Rede: http://[SEU_IP]:${PORT}`);
    console.log(`📁 Pasta principal: ${__dirname}`);
    console.log('');
    console.log('🔍 PASTAS DE BUSCA:');
    searchPaths.forEach((p, i) => console.log(`   ${i + 1}. ${p}`));
    console.log('');
    console.log('📋 INSTRUÇÕES:');
    console.log('1. Abra seu navegador');
    console.log(`2. Acesse: http://localhost:${PORT}`);
    console.log('3. O jogo deve carregar sem erros de CORS!');
    console.log('');
    console.log('⚠️  IMPORTANTE: Mantenha este terminal aberto!');
    console.log('   Para parar o servidor, pressione Ctrl+C');
    console.log('================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Encerrando servidor do jogo...');
    server.close(() => {
        console.log('✅ Servidor encerrado.');
        process.exit(0);
    });
});

// Tratamento de erros
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Erro: Porta ${PORT} já está em uso!`);
        console.log('💡 Soluções:');
        console.log(`   1. Feche outros programas que usem a porta ${PORT}`);
        console.log('   2. Ou modifique a porta no arquivo serve-game.js');
    } else {
        console.error('❌ Erro no servidor:', err);
    }
});
