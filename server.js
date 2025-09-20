// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Configuração ---
app.use(express.static(path.join(__dirname, 'public')));

// Opções da roleta (agora no servidor!)
const opcoes = [
    {titulo:"Você é maravilhosa 😍", info:"Envie uma mensagem ou emoji mostrando o quanto você me acha especial!", peso: 1},
    {titulo:"Vale-McDonalds 🍔", info:"Você acaba de ganhar um delicioso Mc da sua escolha!", peso: 1},
    {titulo:"Conte um segredo 🗝️", info:"Compartilhe algo divertido ou curioso sobre nós.", peso: 3},
    {titulo:"Momento música 🎵", info:"Envie uma música que te faz lembrar de mim ou peça que eu te envie uma.", peso: 2},
    {titulo:"Desafio divertido 😏", info:"Você escolhe um desafio para eu cumprir — algo divertido e inofensivo.", peso: 1},
    {titulo:"Mensagem secreta 💌", info:"Receba uma mensagem carinhosa inesperada.", peso: 1},
    {titulo:"Verdade Absoluta 🔥", info:"Vou te fazer uma pergunta e você terá que responder com toda a sinceridade — verdade absoluta!", peso: 4},
    {titulo:"Pedido especial 🌟", info:"Você acaba de ganhar um Pedido; peça e lhe será concedido.", peso: 3}
];
const somaPesos = opcoes.reduce((acc, o) => acc + o.peso, 0);

function escolherIndicePonderado(){
    let r = Math.random() * somaPesos;
    for (let i = 0; i < opcoes.length; i++){
        if (r < opcoes[i].peso) return i;
        r -= opcoes[i].peso;
    }
    return opcoes.length - 1;
}

// --- Estado do Jogo (centralizado no servidor) ---
const jogadoresConectados = {};
let vezDe = null;
let jogadorIndice = 0;

function proximaVez(){
    const ids = Object.keys(jogadoresConectados);
    if(ids.length === 0) {
        vezDe = null;
        return;
    }
    jogadorIndice = (jogadorIndice + 1) % ids.length;
    vezDe = jogadoresConectados[ids[jogadorIndice]];
    io.emit('vez-de', vezDe); // Avisa a todos quem é a vez
    console.log(`Próxima vez: ${vezDe}`);
}

function iniciarJogo(){
    console.log('2 jogadores conectados. Jogo iniciado!');
    proximaVez();
}

// --- Eventos Socket.IO ---
io.on('connection', (socket) => {
    console.log('Novo usuário conectado:', socket.id);
    const numJogadores = Object.keys(jogadoresConectados).length;

    if (numJogadores === 0) {
        socket.emit('status', 'Aguardando outro jogador...');
    }

    socket.on('login', (nome) => {
        const numJogadores = Object.keys(jogadoresConectados).length;
        if (numJogadores >= 2) {
            socket.emit('login-resposta', { sucesso: false, mensagem: 'A sala está cheia. Tente novamente mais tarde.' });
            return;
        }
        if (Object.values(jogadoresConectados).includes(nome)) {
            socket.emit('login-resposta', { sucesso: false, mensagem: 'Esse nome já está em uso.' });
            return;
        }
        
        jogadoresConectados[socket.id] = nome;
        socket.emit('login-resposta', { sucesso: true, nome: nome });
        console.log(`Jogador ${nome} logou. Total de jogadores: ${Object.keys(jogadoresConectados).length}`);
        
        if (Object.keys(jogadoresConectados).length === 2) {
            iniciarJogo();
        }
    });

    socket.on('girar-roleta', () => {
        if (jogadoresConectados[socket.id] !== vezDe) {
            console.log(`Jogador ${jogadoresConectados[socket.id]} tentou girar fora de sua vez.`);
            socket.emit('roleta-erro', 'Não é sua vez de jogar!');
            return;
        }
        
        const indiceEscolhido = escolherIndicePonderado();
        
        const resultado = {
            indice: indiceEscolhido,
            nomeJogadorDaVez: vezDe
        };
        
        io.emit('resultadoRoleta', resultado);
        console.log(`Roleta girou. Resultado: ${opcoes[indiceEscolhido].titulo}`);
        
        proximaVez();
    });

    socket.on('disconnect', () => {
        const nomeDesconectado = jogadoresConectados[socket.id];
        delete jogadoresConectados[socket.id];
        console.log(`Usuário ${nomeDesconectado} saiu.`);
        if (Object.keys(jogadoresConectados).length < 2) {
            vezDe = null;
            io.emit('vez-de', null);
            io.emit('status', 'Aguardando outro jogador...');
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});