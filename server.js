const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname,'public')));

const opcoes = [
    {titulo:"Você é maravilhosa 😍", info:"Envie uma mensagem ou emoji mostrando o quanto você me acha especial!", peso:1},
    {titulo:"Vale-McDonalds 🍔", info:"Você acaba de ganhar um delicioso Mc da sua escolha!", peso:1},
    {titulo:"Conte um segredo 🗝️", info:"Compartilhe algo divertido ou curioso sobre nós.", peso:3},
    {titulo:"Momento música 🎵", info:"Envie uma música que te faz lembrar de mim ou peça que eu te envie uma.", peso:2},
    {titulo:"Desafio divertido 😏", info:"Você escolhe um desafio para eu cumprir — algo divertido e inofensivo.", peso:1},
    {titulo:"Mensagem secreta 💌", info:"Receba uma mensagem carinhosa inesperada.", peso:1},
    {titulo:"Verdade Absoluta 🔥", info:"Vou te fazer uma pergunta e você terá que responder com toda a sinceridade — verdade absoluta!", peso:4},
    {titulo:"Pedido especial 🌟", info:"Você acaba de ganhar um Pedido; peça e lhe será concedido.", peso:3}
];
const somaPesos = opcoes.reduce((acc,o)=>acc+o.peso,0);

function escolherIndicePonderado(){
    let r=Math.random()*somaPesos;
    for(let i=0;i<opcoes.length;i++){
        if(r<opcoes[i].peso) return i;
        r-=opcoes[i].peso;
    }
    return opcoes.length-1;
}

// Estado do jogo
const jogadoresConectados = {};
let vezDe=null;
let jogadorIndice=0;
let timerInatividade=null;

function proximaVez(){
    const ids=Object.keys(jogadoresConectados);
    if(ids.length===0){ vezDe=null; return; }
    jogadorIndice=(jogadorIndice+1)%ids.length;
    vezDe=jogadoresConectados[ids[jogadorIndice]];
    io.emit('vez-de',vezDe);
    reiniciarTimerInatividade();
}

function iniciarJogo(){
    proximaVez();
    reiniciarTimerInatividade();
}

// Timer global
function reiniciarTimerInatividade(){
    if(timerInatividade) clearTimeout(timerInatividade);
    timerInatividade=setTimeout(()=>{
        console.log("40s inatividade, reiniciando jogo...");
        io.emit('inatividade-40s');
        for(let id of Object.keys(jogadoresConectados)) delete jogadoresConectados[id];
        vezDe=null;
        jogadorIndice=0;
        timerInatividade=null;
    }, 40*1000);
}

// Socket
io.on('connection',(socket)=>{
    console.log("Novo usuário:",socket.id);

    socket.on('login',(nome)=>{
        if(Object.keys(jogadoresConectados).length>=2){
            socket.emit('login-resposta',{sucesso:false,mensagem:"Sala cheia"});
            return;
        }
        if(Object.values(jogadoresConectados).includes(nome)){
            socket.emit('login-resposta',{sucesso:false,mensagem:"Nome em uso"});
            return;
        }

        jogadoresConectados[socket.id]=nome;
        socket.emit('login-resposta',{sucesso:true,nome:nome});

        if(Object.keys(jogadoresConectados).length===2) iniciarJogo();
    });

    socket.on('girar-roleta',()=>{
        if(jogadoresConectados[socket.id]!==vezDe){
            socket.emit('roleta-erro','Não é sua vez!');
            return;
        }
        const indiceEscolhido=escolherIndicePonderado();
        io.emit('resultadoRoleta',{indice:indiceEscolhido,nomeJogadorDaVez:vezDe});
        proximaVez();
    });

    socket.on('disconnect',()=>{
        delete jogadoresConectados[socket.id];
        vezDe=null;
        io.emit('status','Aguardando outro jogador...');
    });
});

server.listen(3000,()=>console.log("Servidor rodando em http://localhost:3000"));
