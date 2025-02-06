// Gerenciamento de pastelaria com JavaScript puro

const mesas = JSON.parse(localStorage.getItem("mesas")) || [
  { id: 1, pedidos: [], total: 0, observacao: "", adiantamento: 0 },
  { id: 2, pedidos: [], total: 0, observacao: "", adiantamento: 0 },
  { id: 3, pedidos: [], total: 0, observacao: "", adiantamento: 0 },
  { id: 4, pedidos: [], total: 0, observacao: "", adiantamento: 0 },
];

const historico = {
  transacoes: [],
  totalRecebido: 0,
  pagamentosPorForma: {
    dinheiro: 0,
    cartão: 0,
    pix: 0,
    "pix maq": 0,
  },
};

// Adiciona evento ao botão
document.getElementById("limpar-dados").addEventListener("click", limparDados);
const produto = {
  nome: "",
  quantidade: 0,
  valorUnitario: 0,
};

function limparDados() {
  if (confirm("Tem certeza que deseja apagar todos os dados do dia? Esta ação não pode ser desfeita.")) {
    localStorage.removeItem("mesas");
    localStorage.removeItem("historico");
    location.reload(); // Recarrega a página para limpar os dados na interface
  }
}

function mostrarAjuda() {
  alert(
    "📌 Como usar o sistema:\n\n" +
    "1️⃣ Selecione a mesa no menu suspenso.\n" +
    "2️⃣ Digite o nome do produto, a quantidade e o valor unitário.\n" +
    "3️⃣ Escolha a forma de pagamento.\n" +
    "4️⃣ Clique em 'Adicionar Produto' para inserir o pedido na mesa.\n" +
    "5️⃣ Para fechar uma conta, clique no botão 'Fechar Conta' na mesa correspondente.\n" +
    "6️⃣ Para exportar os dados do dia, clique em 'Exportar para Excel'.\n" +
    "7️⃣ Para apagar os dados e iniciar um novo dia, clique em 'Limpar Dados'.\n\n" +
    "⚠️ Atenção: O botão 'Limpar Dados' exclui permanentemente os registros do dia!"
  );
}

// Adiciona evento ao botão
document.getElementById("ajuda").addEventListener("click", mostrarAjuda);

function adicionarProduto(mesaId) {
  const mesa = mesas.find((m) => m.id === mesaId);
  if (!produto.nome || produto.quantidade <= 0 || produto.valorUnitario <= 0) return;

  const valorTotal = produto.quantidade * produto.valorUnitario;
  const novoPedido = { ...produto, valorTotal };
  mesa.pedidos.push(novoPedido);
  mesa.total += valorTotal;

  produto.nome = "";
  produto.quantidade = 0;
  produto.valorUnitario = 0;

  atualizarInterface();
}

function fecharConta(mesaId) {
  const mesa = mesas.find((m) => m.id === mesaId);
  if (!mesa || mesa.total === 0) {
    alert("Essa mesa não possui pedidos.");
    return;
  }

  const formaPagamento = prompt("Informe a forma de pagamento (dinheiro, cartão, pix, pix maq):");
  if (!["dinheiro", "cartão", "pix", "pix maq"].includes(formaPagamento)) {
    alert("Forma de pagamento inválida.");
    return;
  }

  historico.transacoes.push({
    mesa: mesa.id,
    total: mesa.total,
    formaPagamento,
    dataPagamento: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    pedidos: [...mesa.pedidos],
  });
  historico.totalRecebido += mesa.total;
  historico.pagamentosPorForma[formaPagamento] += mesa.total;

  mesa.pedidos = [];
  mesa.total = 0;
  mesa.adiantamento = 0;

  atualizarInterface();
  salvarDados();
}

function exportarParaExcel() {
  const dadosMesas = mesas.flatMap(mesa => {
    const pedidos = mesa.pedidos.map(pedido => ({
      Mesa: `Mesa ${mesa.id}`,
      Produto: pedido.nome,
      Quantidade: pedido.quantidade,
      "Valor Unitário": pedido.valorUnitario.toFixed(2),
      "Valor Total": pedido.valorTotal.toFixed(2),
      "Forma de Pagamento": "Pendente", // Como ainda não foi fechado, a forma de pagamento fica em aberto
      "Data de Pagamento": "Pendente"
    }));

     // Adiciona um resumo do total gasto na mesa antes da listagem dos pedidos
     if (mesa.pedidos.length > 0) {
      pedidos.unshift({
        Mesa: `Mesa ${mesa.id}`,
        Produto: "TOTAL DA MESA",
        Quantidade: "",
        "Valor Unitário": "",
        "Valor Total": mesa.total.toFixed(2),
        "Forma de Pagamento": "",
        "Data de Pagamento": "",
      });

      pedidos.push({}, {}); // Adiciona duas linhas vazias para organização
    }

    return pedidos;
  });
  // Adicionar transações já fechadas (do histórico)
  const dadosHistorico = historico.transacoes.flatMap(transacao => {
    const pedidos = transacao.pedidos.map(pedido => ({
      Mesa: `Mesa ${transacao.mesa}`,
      Produto: pedido.nome,
      Quantidade: pedido.quantidade,
      "Valor Unitário": pedido.valorUnitario.toFixed(2),
      "Valor Total": pedido.valorTotal.toFixed(2),
      "Forma de Pagamento": transacao.formaPagamento,
      "Data de Pagamento": transacao.dataPagamento,
    }));
     // Adiciona um resumo do total gasto na mesa antes da listagem dos pedidos
     pedidos.unshift({
      Mesa: `Mesa ${transacao.mesa}`,
      Produto: "TOTAL DA MESA",
      Quantidade: "",
      "Valor Unitário": "",
      "Valor Total": transacao.total.toFixed(2),
      "Forma de Pagamento": transacao.formaPagamento,
      "Data de Pagamento": transacao.dataPagamento,
    });
    pedidos.push({}, {}); // Adiciona duas linhas vazias para organização

    return pedidos;
  });
  const resumo = [
    { Descrição: "Total do Dia", Valor: historico.totalRecebido.toFixed(2) },
    ...Object.entries(historico.pagamentosPorForma).map(([forma, valor]) => ({
      Descrição: `Total Pago em ${forma}`,
      Valor: valor.toFixed(2),
    })),
  ];

  const worksheetMesas = XLSX.utils.json_to_sheet([...dadosMesas, ...dadosHistorico]);
  const worksheetResumo = XLSX.utils.json_to_sheet(resumo);

  // Criando um workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheetMesas, "Transações");
  XLSX.utils.book_append_sheet(workbook, worksheetResumo, "Resumo do Dia");
  
  const range = XLSX.utils.decode_range(worksheetMesas["!ref"]);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    const cellAddress = XLSX.utils.encode_cell({ r: R, c: 1 }); // Coluna "Produto"
    if (worksheetMesas[cellAddress] && worksheetMesas[cellAddress].v === "TOTAL DA MESA") {
      const totalCellAddress = XLSX.utils.encode_cell({ r: R, c: 4 }); // Coluna "Valor Total"
      if (!worksheetMesas[totalCellAddress].s) worksheetMesas[totalCellAddress].s = {};
      worksheetMesas[totalCellAddress].s = { fill: { fgColor: { rgb: "00FF00" } } }; // Verde
    }
  }

 // Salvar o arquivo Excel
 XLSX.writeFile(workbook, "fechamento_caixa.xlsx");

 // 🔹 Salvar os dados das mesas no localStorage para não perder após exportar
 salvarDados();
}
function salvarDados() {
  localStorage.setItem("mesas", JSON.stringify(mesas));
  localStorage.setItem("historico", JSON.stringify(historico));
}
function atualizarInterface() {
  const container = document.getElementById("mesas-container");
  container.innerHTML = "";

  mesas.forEach((mesa, index) => {
    const mesaDiv = document.createElement("div");
    mesaDiv.className = "mesa";
    mesaDiv.classList.toggle("com-pedidos", mesa.pedidos.length > 0);
    mesaDiv.classList.toggle("sem-pedidos", mesa.pedidos.length === 0);

    mesaDiv.innerHTML = `
      <div class="mesa-header">
        <h2>Mesa ${mesa.id}</h2>
        <button class="remove-mesa-btn" onclick="removerMesa(${index})">❌</button>
      </div>
      <div>
        ${mesa.pedidos
          .map(
            (pedido, itemIndex) => `
              <p>${pedido.nome} x${pedido.quantidade} - R$ ${pedido.valorTotal.toFixed(2)}
              <button onclick="removerItem(${mesa.id}, ${itemIndex})">Remover</button>
              </p>
            `
          )
          .join("")}
      </div>
      <p><strong>Total:</strong> R$ ${mesa.total.toFixed(2)}</p>
      <button onclick="fecharConta(${mesa.id})">Fechar Conta</button>
    `;

    container.appendChild(mesaDiv);
  });
}
function removerMesa(index) {
  if (confirm(`Tem certeza que deseja remover a Mesa ${mesas[index].id}?`)) {
    mesas.splice(index, 1); // Remove a mesa do array

    // Atualiza o dropdown de seleção de mesas
    const selectMesa = document.getElementById("mesa-selecionada");
    selectMesa.innerHTML = ""; // Limpa todas as opções antes de recriar

    // Recria as opções de mesa atualizadas
    mesas.forEach((mesa) => {
      const opcao = document.createElement("option");
      opcao.value = mesa.id;
      opcao.textContent = `Mesa ${mesa.id}`;
      selectMesa.appendChild(opcao);
    });

    atualizarInterface();
    salvarDados();
  }
}
function removerItem(mesaId, itemIndex) {
  const mesa = mesas.find((m) => m.id === mesaId);
  if (mesa) {
    mesa.total -= mesa.pedidos[itemIndex].valorTotal; // Atualiza o total da mesa
    mesa.pedidos.splice(itemIndex, 1); // Remove o item do array de pedidos

    salvarDados();  // Salva os dados após a remoção
    atualizarInterface();  // Atualiza a interface para refletir a mudança
  }
}

function adicionarMesa() {
  const novaMesaId = mesas.length + 1;
  mesas.push({ id: novaMesaId, pedidos: [], total: 0, pago: 0 });

  // Adiciona a nova mesa ao dropdown de seleção
  const selectMesa = document.getElementById("mesa-selecionada");
  const novaOpcao = document.createElement("option");
  novaOpcao.value = novaMesaId;
  novaOpcao.textContent = `Mesa ${novaMesaId}`;
  selectMesa.appendChild(novaOpcao);

  atualizarInterface();
  salvarDados();
}

function configurarEventos() {
  document.getElementById("adicionar-produto").addEventListener("click", () => {
    const mesaId = parseInt(document.getElementById("mesa-selecionada").value);
    produto.nome = document.getElementById("nome-produto").value;
    produto.quantidade = parseInt(document.getElementById("quantidade-produto").value);
    produto.valorUnitario = parseFloat(document.getElementById("valor-produto").value);

    adicionarProduto(mesaId);
  });

  document.getElementById("adicionar-mesa").addEventListener("click", adicionarMesa);
  document.getElementById("exportar-excel").addEventListener("click", exportarParaExcel);
}

window.onload = () => {
  if (localStorage.getItem("mesas")) {
    mesas.length = 0; // Limpa o array sem perder a referência
    mesas.push(...JSON.parse(localStorage.getItem("mesas")));
  }

  if (localStorage.getItem("historico")) {
    Object.assign(historico, JSON.parse(localStorage.getItem("historico")));
  }

  configurarEventos();
  atualizarInterface();
};

