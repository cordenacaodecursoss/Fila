import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
    getFirestore, collection, query, orderBy, limit, 
    getDocs, addDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyALsWVVeElwPGkSHzRm7Vaw-LRDVBCwY3A",
    authDomain: "fila-atendimento-7b539.firebaseapp.com",
    projectId: "fila-atendimento-7b539",
    storageBucket: "fila-atendimento-7b539.firebasestorage.app",
    messagingSenderId: "377593193558",
    appId: "1:377593193558:web:5417a6fca8c92087d187f7",
    measurementId: "G-4DR1G5PZC8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("formSenha");
    const mensagem = document.getElementById("mensagem");

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const nome = document.getElementById("nome").value;
        const curso = document.getElementById("curso").value;
        const solicitacao = document.getElementById("solicitacao").value;

        const senhasRef = collection(db, "fila");

        // Pega última senha
        const q = query(senhasRef, orderBy("createdAt", "desc"), limit(1));
        const snap = await getDocs(q);

        let numero = 1;
        if (!snap.empty) {
            const ultima = snap.docs[0].data().senha;
            numero = parseInt(ultima.replace(/[^\d]/g, "")) + 1;
        }

        // Gera nova senha
        const senha = "PSI" + String(numero).padStart(3, "0");

        // Salvar no banco
        await addDoc(senhasRef, {
            nome,
            curso,
            solicitacao,
            senha,
            status: "aguardando",
            atendente: "",
            createdAt: serverTimestamp(),
        });

        mensagem.innerHTML = `Sua senha é: <b>${senha}</b>`;
        form.reset();
    });

});
