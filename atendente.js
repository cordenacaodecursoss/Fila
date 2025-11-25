// js/atendente.js (Corrigido e otimizado)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy,
  onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ---------------------- CONFIG --------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyD-Jymhub4TY_gsIAfYnHBw6VoRDvHdfmY",
  authDomain: "fila-coordenacao.firebaseapp.com",
  projectId: "fila-coordenacao",
  storageBucket: "fila-coordenacao.firebasestorage.app",
  messagingSenderId: "302987735020",
  appId: "1:302987735020:web:af93f41a0210c98fd29ac9",
  measurementId: "G-DEYKDLMJ3E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------------------- UI Refs --------------------- */
const atendSelect = document.getElementById('atendenteSelect');
const filaList = document.getElementById('filaList');
const filaQtd = document.getElementById('filaQtd');
const searchFila = document.getElementById('searchFila');
const minhaFilaList = document.getElementById('minhaFilaList');
const atendimentoList = document.getElementById('atendimentoList');
const attNome = document.getElementById('attNome');
const attStatus = document.getElementById('attStatus');
const btnVerMinhaFila = document.getElementById('btnVerMinhaFila');
const btnVoltarGeral = document.getElementById('btnVoltarGeral');
const historyList = document.getElementById('historyList');
const histQtd = document.getElementById('histQtd');

let currentAtendente = "";

/* ---------------------- Render Helper --------------------- */
function makeItemHTML(data, options = {}) {
  const nome = data.nome || "—";
  const senha = data.senha || "—";
  const curso = data.curso ? ` • ${data.curso}` : "";
  const solicitacao = data.solicitacao ? ` • ${data.solicitacao}` : "";

  const horario = data.createdAt
    ? new Date(data.createdAt.seconds * 1000).toLocaleString()
    : "";

  return `
    <div class="item">
      <div class="avatar">${(nome.split(' ').slice(0,2).map(s=>s[0]).join('')).toUpperCase()}</div>

      <div class="info">
        <div class="name">${nome}</div>
        <div class="meta">Senha: ${senha}${curso}${solicitacao}
          <span style="margin-left:8px;color:#94a3b8;font-weight:600">${horario}</span>
        </div>
      </div>

      <div class="actions">
        ${options.showCall ? `<button class="btn" data-id="${options.id}" data-action="call">Chamar</button>` : ''}
        ${options.showEnd ? `<button class="btn ghost" data-id="${options.id}" data-action="end">Encerrar</button>` : ''}
      </div>
    </div>
  `;
}

/* ---------------------- Fila Geral --------------------- */

const filaRef = collection(db, "fila");

// CORREÇÃO: antes usava "timestamp", agora usa "createdAt"
const qFila = query(
  filaRef,
  where("status", "==", "aguardando"),
  orderBy("createdAt", "asc")
);

onSnapshot(qFila, (snap) => {
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderFilaGeral(docs);
});

function renderFilaGeral(docs) {
  const filtro = searchFila.value.trim().toLowerCase();

  const filtrados = docs.filter(d =>
    d.nome.toLowerCase().includes(filtro) ||
    String(d.senha).toLowerCase().includes(filtro)
  );

  filaList.innerHTML = filtrados.length
    ? filtrados.map(d => makeItemHTML(d, { id: d.id, showCall: true })).join('')
    : '<div class="muted">Nenhum aluno aguardando</div>';

  filaQtd.textContent = String(filtrados.length);
}

/* ---------------------- Chamar aluno --------------------- */

filaList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action="call"]');
  if (!btn) return;

  if (!currentAtendente) {
    return alert("Escolha seu nome antes de chamar um aluno.");
  }

  const id = btn.dataset.id;

  try {
    await updateDoc(doc(db, "fila", id), {
      status: "em_atendimento",
      atendente: currentAtendente,
      chamadoTimestamp: serverTimestamp()
    });
  } catch (err) {
    console.error(err);
  }
});

/* ---------------------- Minha Fila --------------------- */

function listenMinhaFila(atendente) {
  if (!atendente) {
    minhaFilaList.innerHTML = '<div class="muted">Selecione um atendente.</div>';
    atendimentoList.innerHTML = '<div class="muted">—</div>';
    return;
  }

  const qMy = query(
    filaRef,
    where("status", "==", "em_atendimento"),
    where("atendente", "==", atendente),
    orderBy("chamadoTimestamp", "asc")
  );

  onSnapshot(qMy, (snap) => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!docs.length) {
      atendimentoList.innerHTML = '<div class="muted">Nenhum em atendimento</div>';
      minhaFilaList.innerHTML = '<div class="muted">Sua fila está vazia</div>';
      return;
    }

    const atual = docs[0];
    const demais = docs.slice(1);

    atendimentoList.innerHTML = makeItemHTML(atual, { id: atual.id, showEnd: true });

    minhaFilaList.innerHTML = demais.length
      ? demais.map(d => makeItemHTML(d, { id: d.id, showEnd: true })).join('')
      : '<div class="muted">Sem mais alunos</div>';
  });
}

/* ---------------------- Encerrar Atendimento --------------------- */

[minhaFilaList, atendimentoList].forEach(el => {
  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="end"]');
    if (!btn) return;

    const id = btn.dataset.id;
    const docRef = doc(db, "fila", id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return;

    const data = snap.data();

    await addDoc(collection(db, "historico"), {
      nome: data.nome,
      curso: data.curso,
      solicitacao: data.solicitacao,
      senha: data.senha,
      atendente: data.atendente,
      chamadoTimestamp: data.chamadoTimestamp,
      finalizadoTimestamp: serverTimestamp()
    });

    await updateDoc(docRef, {
      status: "finalizado",
      finalizadoTimestamp: serverTimestamp()
    });
  });
});

/* ---------------------- Histórico --------------------- */

const histRef = collection(db, "historico");

const qHist = query(
  histRef,
  orderBy("finalizadoTimestamp", "desc")
);

onSnapshot(qHist, (snap) => {
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  histQtd.textContent = docs.length;

  historyList.innerHTML = docs.length
    ? docs.map(d => `
      <div class="item">
        <div class="avatar">${d.nome.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase()}</div>
        <div class="info">
          <div class="name">${d.nome}</div>
          <div class="meta">${d.senha} • ${d.atendente} • ${d.solicitacao}
            <span style="margin-left:8px;color:#94a3b8">
              ${new Date(d.finalizadoTimestamp.seconds * 1000).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    `).join('')
    : '<div class="muted">Histórico vazio</div>';
});

/* ---------------------- Selecionar Atendente --------------------- */

atendSelect.addEventListener('change', () => {
  currentAtendente = atendSelect.value;
  attNome.textContent = currentAtendente || "—";
  attStatus.textContent = currentAtendente ? "Disponível" : "Offline";
  listenMinhaFila(currentAtendente);
});

/* ---------------------- UI Básica --------------------- */

searchFila.addEventListener('input', () => {
  // O snapshot atualiza automaticamente
});

document.getElementById("btnLogout").addEventListener("click", () => {
  atendSelect.value = "";
  atendSelect.dispatchEvent(new Event("change"));
});

/* Estado inicial */
attNome.textContent = "—";
attStatus.textContent = "Offline";
