const socket = io();

const opcoes = [
    {titulo:"Verdade ou Desafio 🎲", info:"Escolha: responder uma pergunta reveladora com sinceridade ou cumprir um desafio divertido que eu inventar.", peso: 2},
    {titulo:"Vale-McDonalds 🍔", info:"Escolha um Mc e combinamos de comer juntos algum dia!", peso: 1},
    {titulo:"Conte um segredo 🗝️", info:"Compartilhe algo divertido ou curioso sobre nós.", peso: 2},
    {titulo:"Momento música 🎵", info:"Envie uma música que te faz lembrar de mim ou peça que eu te envie uma.", peso: 2},
    {titulo:"Desafio divertido 😏", info:"Você escolhe um desafio para eu cumprir — algo divertido e inofensivo.", peso: 2},
    {titulo:"Momento nostalgia 🕰️", info:"Conte uma lembrança feliz que tenha de nós ou de algo que fizemos juntos.", peso: 2},
    {titulo:"Verdade Absoluta 🔥", info:"Vou te fazer uma pergunta e você terá que responder com toda a sinceridade — verdade absoluta!", peso: 3},
    {titulo:"Pedido especial 🌟", info:"Você acaba de ganhar um Pedido; peça e lhe será concedido.", peso: 2}
];

// Canvas e variáveis
const canvas = document.getElementById('roleta');
const ctx = canvas.getContext('2d');
canvas.width = 300;
canvas.height = 300;
const raio = canvas.width / 2;

let anguloAtual = 0;
let meuNome = localStorage.getItem('meuNome');

// DOM
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

let inatividadeTimer = null;
const TEMPO_MAX_INATIVO = 40 * 1000;
let modoPausa = false;

// Desenho da roleta
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

        ctx.save();
        ctx.translate(raio, raio);
        ctx.rotate(i * anguloFatia + anguloFatia/2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.fillText(opcoes[i].titulo, raio - 10, 5);
        ctx.restore();
    }
}

function redrawStatic(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(raio,raio);
    ctx.rotate(0);
    ctx.translate(-raio,-raio);
    desenharRoleta();
    ctx.restore();
}
redrawStatic();

function neonPulse() {
    const intensity = 12 + Math.sin(Date.now()/300)*2;
    canvas.style.boxShadow = `0 0 ${intensity}px 2px #ff0000, 0 0 ${intensity*2}px 4px #ff0000 inset`;
    requestAnimationFrame(neonPulse);
}
neonPulse();

// Timer inatividade
function iniciarTimerInatividade() {
    if (inatividadeTimer) clearTimeout(inatividadeTimer);

    inatividadeTimer = setTimeout(() => {
        modoPausa = true;
        botaoGirar.disabled = true;
        botaoGirar.textContent = "Atualizar jogo";
    }, TEMPO_MAX_INATIVO);
}

// Animação da roleta
function animarRoleta(indiceEscolhido, callback){
    let inicio = null;
    const duracao = 4000;
    const anguloInicial = anguloAtual;
    const fatias = opcoes.length;
    const anguloFatia = (2*Math.PI)/fatias;
    const anguloAlvo = (3*Math.PI/2) - (indiceEscolhido*anguloFatia + anguloFatia/2);

    const voltasMinimas = 5;
    const voltasExtras = Math.floor(anguloInicial/(2*Math.PI))+voltasMinimas;
    const anguloFinal = anguloAlvo + (voltasExtras*2*Math.PI);

    function animar(timestamp){
        if(!inicio) inicio = timestamp;
        const progresso = timestamp-inicio;
        const t = Math.min(progresso/duracao,1);
        const easeOut = 1 - Math.pow(1-t,3);
        anguloAtual = anguloInicial + (anguloFinal-anguloInicial)*easeOut;

        if(somRoleta){ try{ somRoleta.volume = Math.max(0,1-easeOut); }catch(e){} }

        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.save();
        ctx.translate(raio,raio);
        ctx.rotate(anguloAtual);
        ctx.translate(-raio,-raio);
        desenharRoleta();
        ctx.restore();

        if(t<1) requestAnimationFrame(animar);
        else {
            if(somRoleta){ try{ somRoleta.pause(); somRoleta.currentTime=0;}catch(e){} }
            if(callback) callback();
        }
    }
    requestAnimationFrame(animar);
}

// --- Socket.io ---
socket.on('connect',()=>{
    if(meuNome) socket.emit('login',meuNome);
    else window.location.href="index.html";
});

socket.on('disconnect',(reason)=>{
    alert('Você foi desconectado. Recarregue a página.');
});

socket.on('login-resposta',(data)=>{
    if(!data.sucesso){ alert(data.mensagem); window.location.href="index.html"; }
});

socket.on('vez-de',(nomeDaVez)=>{
    tituloRoleta.style.display='none';
    statusContainer.style.display='none';
    turnoContainer.style.display='flex';
    turnoNome.textContent=nomeDaVez;
    botaoGirar.disabled = (meuNome !== nomeDaVez);
});

socket.on('status',(msg)=>{
    tituloRoleta.style.display='block';
    turnoContainer.style.display='none';
    statusContainer.style.display='flex';
    statusMessage.textContent = msg;
    botaoGirar.disabled = true;
});

// Evento de inatividade 40s do servidor
socket.on('inatividade-40s',()=>{
    modoPausa = true;
    botaoGirar.disabled = true;
    botaoGirar.textContent = "Atualizar jogo";
});

// Clique no botão
botaoGirar.addEventListener('click',()=>{
    if(modoPausa && botaoGirar.textContent==="Atualizar jogo"){
        localStorage.removeItem('meuNome');
        localStorage.removeItem('jogadores');
        window.location.href="index.html";
        return;
    }

    botaoGirar.disabled=true;
    resultadoContainer.style.display='none';
    if(somRoleta){ try{ somRoleta.pause(); somRoleta.currentTime=0; somRoleta.volume=1; somRoleta.play();}catch(e){} }
    socket.emit('girar-roleta');

    iniciarTimerInatividade();
});

socket.on('resultadoRoleta',(data)=>{
    if(typeof data.indice==='number'){
        animarRoleta(data.indice,()=>{
            resultadoTitulo.textContent=opcoes[data.indice].titulo;
            resultadoInfo.textContent=opcoes[data.indice].info;
            resultadoContainer.style.display='flex';

            if(somFim){ try{ somFim.currentTime=0; somFim.play(); }catch(e){} }

            modoPausa=false;
            botaoGirar.disabled=false;

            iniciarTimerInatividade();
        });
    }
});
