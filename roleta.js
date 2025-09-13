// roleta.js (versão final e corrigida)

const socket = io();

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

// Canvas e variáveis
const canvas = document.getElementById('roleta');
const ctx = canvas.getContext('2d');
canvas.width = 300;
canvas.height = 300;
const raio = canvas.width / 2;

let anguloAtual = 0;
let meuNome = localStorage.getItem('meuNome');

// Elementos DOM
const resultadoContainer = document.getElementById('resultado-container');
const resultadoTitulo = document.getElementById('resultado-titulo');
const resultadoInfo = document.getElementById('resultado-info');
const botaoGirar = document.getElementById('girar');
const somRoleta = document.getElementById('som-roleta');
const somFim = document.getElementById('som-fim');
const turnoContainer = document.getElementById('turno-container');
const turnoNome = document.getElementById('turno-nome');
const statusContainer = document.getElementById('status-container');
const statusMessage = document.getElementById('status-message');
const tituloRoleta = document.querySelector('h1');

function L(...args){ console.log('[ROULETTE]', ...args); }

// Desenho da roleta (Versão da roleta local)
function desenharRoleta() {
    const fatias = opcoes.length;
    const anguloFatia = (2 * Math.PI) / fatias;

    for (let i = 0; i < fatias; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'darkred' : 'red';
        ctx.beginPath();
        ctx.moveTo(raio, raio);
        ctx.arc(raio, raio, raio, i * anguloFatia, (i + 1) * anguloFatia);
        ctx.closePath();
        ctx.fill();

        // Texto
        ctx.save();
        ctx.translate(raio, raio);
        ctx.rotate(i * anguloFatia + anguloFatia / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.fillText(opcoes[i].titulo, raio - 10, 5);
        ctx.restore();
    }
}

function redrawStatic(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(raio, raio);
    ctx.rotate(0);
    ctx.translate(-raio, -raio);
    desenharRoleta();
    ctx.restore();
}
redrawStatic();

// Neon pulsante suave (Versão da roleta local)
function neonPulse() {
    const intensity = 12 + Math.sin(Date.now() / 300) * 2;
    canvas.style.boxShadow = `0 0 ${intensity}px 2px #ff0000, 0 0 ${intensity * 2}px 4px #ff0000 inset`;
    requestAnimationFrame(neonPulse);
}
neonPulse();

// --- ANIMAÇÃO: agora baseada nos dados do servidor ---
function animarRoleta(indiceEscolhido, callback){
    let inicio = null;
    const duracao = 4000;
    const anguloInicial = anguloAtual;

    // --- CORREÇÃO DEFINITIVA: Calcula o ângulo de parada no cliente
    const fatias = opcoes.length;
    const anguloFatia = (2 * Math.PI) / fatias;
    const anguloAlvo = (3 * Math.PI / 2) - (indiceEscolhido * anguloFatia + anguloFatia / 2);
    
    // Força um mínimo de 5 voltas completas
    const voltasMinimas = 5;
    const voltasExtras = Math.floor(anguloInicial / (2 * Math.PI)) + voltasMinimas;
    const anguloFinal = anguloAlvo + (voltasExtras * 2 * Math.PI);

    function animar(timestamp){
        if (!inicio) inicio = timestamp;
        const progresso = timestamp - inicio;
        const t = Math.min(progresso / duracao, 1);
        const easeOut = 1 - Math.pow(1 - t, 3);
        anguloAtual = anguloInicial + (anguloFinal - anguloInicial) * easeOut;
        
        // DIMINUI O VOLUME PROGRESSIVAMENTE
        if (somRoleta) {
            try {
                somRoleta.volume = Math.max(0, 1 - easeOut);
            } catch(e){}
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(raio, raio);
        ctx.rotate(anguloAtual);
        ctx.translate(-raio, -raio);
        desenharRoleta();
        ctx.restore();

        if (t < 1){
            requestAnimationFrame(animar);
        } else {
            // PARA O SOM AO FIM DA ANIMAÇÃO
            if (somRoleta) {
                try {
                    somRoleta.pause();
                    somRoleta.currentTime = 0;
                } catch(e){}
            }
            // Chama o callback, que agora exibe o resultado
            if (callback) callback();
        }
    }
    requestAnimationFrame(animar);
}

// -------------------
// Socket.io: Comunicação com o servidor
// -------------------
socket.on('connect', () => {
    L('Socket conectado', socket.id);
    if (meuNome) {
        L('Enviando nome ao servidor:', meuNome);
        socket.emit('login', meuNome);
    } else {
        L('Nenhum nome no localStorage (faça login primeiro).');
        window.location.href = "index.html";
    }
});

socket.on('disconnect', (reason) => {
    L('Socket desconectado:', reason);
    alert('Você foi desconectado. Tente recarregar a página.');
});

socket.on('login-resposta', (data) => {
    if (!data.sucesso) {
        alert(data.mensagem);
        window.location.href = "index.html";
    }
});

socket.on('vez-de', (nomeDaVez) => {
    L('É a vez de:', nomeDaVez);
    tituloRoleta.style.display = 'none';
    statusContainer.style.display = 'none';
    turnoContainer.style.display = 'flex';
    turnoNome.textContent = nomeDaVez;
    botaoGirar.disabled = (meuNome !== nomeDaVez);
});

socket.on('status', (msg) => {
    tituloRoleta.style.display = 'block';
    turnoContainer.style.display = 'none';
    statusContainer.style.display = 'flex';
    statusMessage.textContent = msg;
    botaoGirar.disabled = true;
});

// Clique: agora APENAS informa o servidor
botaoGirar.addEventListener('click', () => {
    botaoGirar.disabled = true;
    resultadoContainer.style.display = 'none';
    
    // REINICIA O ÁUDIO E A ANIMAÇÃO AQUI, ANTES DE COMEÇAR O GIRO
    if (somRoleta) {
        try {
            somRoleta.pause();
            somRoleta.currentTime = 0;
            somRoleta.volume = 1;
            somRoleta.play();
        } catch(e) {}
    }
    L('Solicitando giro ao servidor...');
    socket.emit('girar-roleta');
});

// Recebe o resultado do servidor (todos os clientes)
socket.on('resultadoRoleta', (data) => {
    L('Recebeu resultado do servidor:', data);
    // Envia apenas o índice para a função de animação
    if (typeof data.indice === 'number'){
        animarRoleta(data.indice, () => {
            // Callback após a animação
            try {
                resultadoTitulo.textContent = opcoes[data.indice].titulo;
                resultadoInfo.textContent = opcoes[data.indice].info;
                resultadoContainer.style.display = 'flex';
            } catch(e){ console.warn('Erro ao atualizar DOM do resultado:', e); }

            if (somFim) {
                try { somFim.currentTime = 0; somFim.play(); } catch(e){}
            }
        });
    } else {
        console.warn('Dados de roleta inválidos recebidos.');
    }
});
