// Cada opção agora tem um "peso". Quanto maior o peso, maior a chance.
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

const canvas = document.getElementById('roleta');
const ctx = canvas.getContext('2d');

// Diminuir o tamanho da roleta
canvas.width = 300;
canvas.height = 300;
const raio = canvas.width / 2;

const resultadoContainer = document.getElementById('resultado-container');
const resultadoTitulo = document.getElementById('resultado-titulo');
const resultadoInfo = document.getElementById('resultado-info');

const botaoGirar = document.getElementById('girar');
const somRoleta = document.getElementById('som-roleta');
const somFim = document.getElementById('som-fim');

// Container do turno
const turnoContainer = document.getElementById('turno-container');
const turnoNome = document.getElementById('turno-nome');

// Bloqueia o botão inicialmente
botaoGirar.disabled = true;

// Calcula soma de pesos
const somaPesos = opcoes.reduce((acc, o) => acc + o.peso, 0);

// Função para escolher índice aleatório ponderado
function escolherIndicePonderado() {
    let r = Math.random() * somaPesos;
    for (let i = 0; i < opcoes.length; i++) {
        if (r < opcoes[i].peso) return i;
        r -= opcoes[i].peso;
    }
    return opcoes.length - 1; // fallback
}

// Desenhar roleta (todas fatias iguais visualmente)
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
        ctx.font = "12px Arial"; // fonte menor para caber
        ctx.fillText(opcoes[i].titulo, raio - 10, 5);
        ctx.restore();
    }
}

desenharRoleta();

// Neon pulsante suave
function neonPulse() {
    const intensity = 12 + Math.sin(Date.now() / 300) * 2; // piscada mais lenta e suave
    canvas.style.boxShadow = `0 0 ${intensity}px 2px #ff0000, 0 0 ${intensity*2}px 4px #ff0000 inset`;
    requestAnimationFrame(neonPulse);
}
neonPulse();

// Mostrar turno do jogador
function mostrarTurno(jogador) {
    turnoNome.textContent = jogador;
    turnoContainer.style.display = 'flex';
}

// Inicialização ao abrir a roleta
window.addEventListener('load', () => {
    const titulo = document.querySelector('h1');
    titulo.style.display = 'block';

    setTimeout(() => {
        titulo.style.display = 'none';
        mostrarTurno(localStorage.getItem('meuNome') || 'Jogador 1');
        botaoGirar.disabled = false;
    }, 3000);
});

// Girar roleta
let anguloAtual = 0;

botaoGirar.addEventListener('click', () => {
    botaoGirar.disabled = true;
    resultadoContainer.style.display = 'none';

    // Sorteia índice ponderado
    const indiceEscolhido = escolherIndicePonderado();
    const fatias = opcoes.length;
    const anguloFatia = (2 * Math.PI) / fatias;
    const anguloAlvo = (3 * Math.PI / 2) - (indiceEscolhido * anguloFatia + anguloFatia / 2);

    const girosExtras = Math.floor(Math.random() * 5) + 5;
    const anguloFinal = anguloAlvo + girosExtras * 2 * Math.PI;

    let inicio = null;
    const duracao = 4000;
    const anguloInicial = anguloAtual;

    // Som inicial
    somRoleta.currentTime = 0;
    somRoleta.volume = 1;
    somRoleta.play();

    function animar(timestamp) {
        if (!inicio) inicio = timestamp;
        const progresso = timestamp - inicio;
        const t = Math.min(progresso / duracao, 1);
        const easeOut = 1 - Math.pow(1 - t, 3);
        anguloAtual = anguloInicial + (anguloFinal - anguloInicial) * easeOut;

        // Diminuir volume progressivamente
        somRoleta.volume = 1 - easeOut;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(raio, raio);
        ctx.rotate(anguloAtual);
        ctx.translate(-raio, -raio);
        desenharRoleta();
        ctx.restore();

        if (t < 1) {
            requestAnimationFrame(animar);
        } else {
            somRoleta.pause();
            somRoleta.currentTime = 0;

            // Mostrar resultado após 1s
            setTimeout(() => {
                resultadoTitulo.textContent = opcoes[indiceEscolhido].titulo;
                resultadoInfo.textContent = opcoes[indiceEscolhido].info;
                resultadoContainer.style.display = 'flex';

                somFim.currentTime = 0;
                somFim.play();

                setTimeout(() => {
                    botaoGirar.disabled = false;
                }, 500);
            }, 1000);
        }
    }

    requestAnimationFrame(animar);
});
