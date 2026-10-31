// =====================================================
// MARY BOUTIQUE — SISTEMA DE VENDAS
// Vendas, parcelamentos, exclusão e relatórios
// =====================================================

let produtos = [];
let itensVenda = [];
let vendas = [];
let abaAtual = "todas";

let vendaEmDetalhes = null;
let salvandoVenda = false;
let excluindoVenda = false;
let atualizandoPagamento = false;

// =====================================================
// ELEMENTOS
// =====================================================

const saleModal = document.getElementById("sale-modal");
const detailsModal = document.getElementById("details-modal");
const saleForm = document.getElementById("sale-form");
const salesList = document.getElementById("sales-list");

const saleProduct = document.getElementById("sale-product");
const saleQuantity = document.getElementById("sale-quantity");
const saleItems = document.getElementById("sale-items");
const saleTotal = document.getElementById("sale-total");

const reportModal = document.getElementById("report-modal");
const reportStartDate = document.getElementById("report-start-date");
const reportEndDate = document.getElementById("report-end-date");
const reportStatus = document.getElementById("report-status");
const reportCount = document.getElementById("report-count");
const reportTotal = document.getElementById("report-total");
const reportPending = document.getElementById("report-pending");
const reportMessage = document.getElementById("report-message");

// =====================================================
// INICIALIZAÇÃO
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {
configurarEventos();

const autenticado = await verificarUsuario();  

if (!autenticado) return;  

try {  
    await carregarProdutos();  
    await carregarVendas();  
    await atualizarResumo();  
    atualizarPreviewRelatorio();  
} catch (error) {  
    mostrarErro(  
        "Não foi possível carregar os dados. Atualize a página para tentar novamente.",  
        error  
    );  
}

});

// =====================================================
// UTILITÁRIOS
// =====================================================

function elemento(id) {
return document.getElementById(id);
}

function texto(id, valor) {
const el = elemento(id);

if (el) {  
    el.textContent = valor;  
}

}

function escaparHTML(valor) {
function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => {
        const mapa = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return mapa[caractere];
    });
}

function numero(valor) {
const resultado = Number(valor);

return Number.isFinite(resultado) ? resultado : 0;

}

function formatarMoeda(valor) {
return numero(valor).toLocaleString("pt-BR", {
minimumFractionDigits: 2,
maximumFractionDigits: 2
});
}

function formatarData(valor, incluirHora = false) {
if (!valor) return "Não informada";

const data = new Date(valor);  

if (Number.isNaN(data.getTime())) {  
    return "Data inválida";  
}  

return incluirHora  
    ? data.toLocaleString("pt-BR")  
    : data.toLocaleDateString("pt-BR");

}

function dataLocalISO(data = new Date()) {
const ano = data.getFullYear();
const mes = String(data.getMonth() + 1).padStart(2, "0");
const dia = String(data.getDate()).padStart(2, "0");

return `${ano}-${mes}-${dia}`;

}

function obterNomeProduto(produto) {
return produto?.nome || produto?.name || "Produto";
}

function mostrarErro(mensagem, erro) {
console.error(mensagem, erro || "");

alert(  
    erro?.message  
        ? `${mensagem}\n\nDetalhes: ${erro.message}`  
        : mensagem  
);

}

function rpcAusente(error) {
return ["PGRST202", "42883"].includes(error?.code);
}

function vendaEstaPaga(venda) {
return venda?.status_pagamento === "pago";
}

function vendaEstaPendente(venda) {
return (
venda?.status_pagamento === "pendente" &&
venda?.forma_pagamento === "fiado"
);
}

// =====================================================
// VERIFICAR LOGIN
// =====================================================

async function verificarUsuario() {
try {
const {
data: { user },
error
} = await supabaseClient.auth.getUser();

if (error) throw error;  

    if (!user) {  
        window.location.href = "index.html";  
        return false;  
    }  

    return true;  
} catch (error) {  
    console.error("Erro ao verificar usuário:", error);  

    window.location.href = "index.html";  
    return false;  
}

}

// =====================================================
// LOGOUT
// =====================================================

async function sair() {
try {
const { error } = await supabaseClient.auth.signOut();

if (error) throw error;  

    window.location.href = "index.html";  
} catch (error) {  
    mostrarErro("Não foi possível sair da conta.", error);  
}

}

// =====================================================
// CARREGAR PRODUTOS
// =====================================================

async function carregarProdutos() {
if (!saleProduct) return;

const { data, error } = await supabaseClient  
    .from("produtos")  
    .select("id, nome, preco, quantidade")  
    .order("nome", { ascending: true });  

if (error) {  
    console.error("Erro ao carregar produtos:", error);  

    saleProduct.innerHTML = `  
        <option value="">Erro ao carregar produtos</option>  
    `;  

    return;  
}  

produtos = data || [];  

saleProduct.innerHTML = `  
    <option value="">Selecione um produto</option>  
`;  

produtos  
    .filter(produto => numero(produto.quantidade) > 0)  
    .forEach(produto => {  
        const option = document.createElement("option");  

        option.value = produto.id;  

        option.textContent =  
            `${obterNomeProduto(produto)} — R$ ${formatarMoeda(produto.preco)} (${produto.quantidade} disponíveis)`;  

        saleProduct.appendChild(option);  
    });

}

// =====================================================
// ADICIONAR PRODUTO À VENDA
// =====================================================

function adicionarProdutoVenda() {
if (salvandoVenda) return;

const produtoId = saleProduct?.value;  
const quantidade = Number(saleQuantity?.value);  

if (!produtoId) {  
    alert("Selecione um produto.");  
    return;  
}  

if (!Number.isInteger(quantidade) || quantidade <= 0) {  
    alert("Informe uma quantidade inteira válida.");  
    return;  
}  

const produto = produtos.find(  
    item => String(item.id) === String(produtoId)  
);  

if (!produto) {  
    alert("Produto não encontrado.");  
    return;  
}  

const estoque = numero(produto.quantidade);  

const itemExistente = itensVenda.find(  
    item => String(item.produto_id) === String(produto.id)  
);  

const quantidadeAtual = itemExistente  
    ? itemExistente.quantidade  
    : 0;  

if (quantidadeAtual + quantidade > estoque) {  
    alert(  
        `Estoque insuficiente. Disponível: ${estoque} unidade(s).`  
    );  

    return;  
}  

if (itemExistente) {  
    itemExistente.quantidade += quantidade;  
} else {  
    itensVenda.push({  
        produto_id: produto.id,  
        nome: obterNomeProduto(produto),  
        quantidade,  
        preco: numero(produto.preco)  
    });  
}  

renderizarItens();  

saleProduct.value = "";  

if (saleQuantity) {  
    saleQuantity.value = 1;  
}

}

// =====================================================
// RENDERIZAR ITENS
// =====================================================

function renderizarItens() {
if (!saleItems) return;

if (itensVenda.length === 0) {  
    saleItems.innerHTML = `  
        <p class="empty-sale">Nenhum produto adicionado.</p>  
    `;  

    atualizarTotal();  

    return;  
}  

saleItems.innerHTML = "";  

itensVenda.forEach((item, index) => {  
    const subtotal = item.preco * item.quantidade;  

    const div = document.createElement("div");  

    div.className = "sale-item";  

    div.innerHTML = `  
        <div>  
            <strong>${escaparHTML(item.nome)}</strong>  

            <span>  
                ${item.quantidade} × R$ ${formatarMoeda(item.preco)}  
            </span>  
        </div>  

        <div class="sale-item-right">  
            <strong>R$ ${formatarMoeda(subtotal)}</strong>  

            <button  
                type="button"  
                class="remove-item"  
                data-remover-item="${index}"  
                aria-label="Remover ${escaparHTML(item.nome)}"  
            >  
                ×  
            </button>  
        </div>  
    `;  

    saleItems.appendChild(div);  
});  

atualizarTotal();

}

// =====================================================
// REMOVER ITEM
// =====================================================

function removerItem(index) {
if (salvandoVenda) return;

if (  
    !Number.isInteger(index) ||  
    index < 0 ||  
    index >= itensVenda.length  
) {  
    return;  
}  

itensVenda.splice(index, 1);  

renderizarItens();

}

// =====================================================
// TOTAL
// =====================================================

function calcularTotal() {
const centavos = itensVenda.reduce((total, item) => {
const precoCentavos = Math.round(numero(item.preco) * 100);

return total + precoCentavos * numero(item.quantidade);  
}, 0);  

return centavos / 100;

}

function atualizarTotal() {
    if (saleTotal) {
        saleTotal.textContent =
            `R$ ${formatarMoeda(calcularTotal())}`;
    }

    atualizarValorParcela();
}

// =====================================================
// PARCELAMENTO
// =====================================================

function configurarParcelamento() {
const formaPagamento = elemento("payment-method");
const opcoesParcelamento = elemento("installment-options");
const campoParcelas = elemento("installment-count");

if (!formaPagamento || !opcoesParcelamento || !campoParcelas) {  
    console.warn(  
        "Campos de parcelamento não encontrados. Confira o HTML."  
    );  

    return;  
}  

function atualizarVisibilidade() {  
    const parcelado = formaPagamento.value === "parcelado";  

    opcoesParcelamento.style.display =  
        parcelado ? "block" : "none";  

    atualizarValorParcela();  
}  

formaPagamento.addEventListener(  
    "change",  
    atualizarVisibilidade  
);  

campoParcelas.addEventListener(  
    "change",  
    atualizarValorParcela  
);  

campoParcelas.addEventListener(  
    "input",  
    atualizarValorParcela  
);  

atualizarVisibilidade();

}

function obterQuantidadeParcelas() {
const campo = elemento("installment-count");

const quantidade = Number(campo?.value || 2);  

if (  
    !Number.isInteger(quantidade) ||  
    quantidade < 2 ||  
    quantidade > 12  
) {  
    return null;  
}  

return quantidade;

}

function calcularParcelas(total, quantidade) {
const totalCentavos = Math.round(numero(total) * 100);

if (  
    !Number.isInteger(quantidade) ||  
    quantidade < 1 ||  
    totalCentavos < 0  
) {  
    return [];  
}  

const valorBase = Math.floor(  
    totalCentavos / quantidade  
);  

const resto = totalCentavos % quantidade;  

return Array.from({ length: quantidade }, (_, index) => {  
    const centavos =  
        valorBase + (index < resto ? 1 : 0);  

    return centavos / 100;  
});

}

function obterResumoParcelas(total, quantidade) {
const parcelas = calcularParcelas(total, quantidade);

if (parcelas.length === 0) {  
    return "Parcelamento indisponível.";  
}  

const valoresUnicos = [...new Set(parcelas)];  

if (valoresUnicos.length === 1) {  
    return `${quantidade}x de R$ ${formatarMoeda(parcelas[0])}`;  
}  

return (  
    `${quantidade} parcelas, de R$ ` +  
    `${formatarMoeda(Math.min(...parcelas))} a R$ ` +  
    `${formatarMoeda(Math.max(...parcelas))}`  
);

}

function atualizarValorParcela() {
const campoValor = elemento("installment-value");
const formaPagamento = elemento("payment-method");

if (!campoValor || !formaPagamento) return;  

if (formaPagamento.value !== "parcelado") {  
    campoValor.textContent = "";  
    return;  
}  

const quantidade = obterQuantidadeParcelas();  

if (!quantidade) {  
    campoValor.textContent =  
        "Selecione entre 2 e 12 parcelas.";  

    return;  
}  

const total = calcularTotal();  

if (total <= 0) {  
    campoValor.textContent =  
        "Adicione produtos para calcular as parcelas.";  

    return;  
}  

campoValor.textContent =  
    obterResumoParcelas(total, quantidade);

}

// =====================================================
// CRIAR / ENCONTRAR CLIENTE
// =====================================================

async function obterCliente(nome, telefone) {
const nomeNormalizado = nome.trim();

if (!nomeNormalizado) {  
    throw new Error("Informe o nome do cliente.");  
}  

const { data, error } = await supabaseClient  
    .from("clientes")  
    .select("*")  
    .eq("nome", nomeNormalizado)  
    .limit(1);  

if (error) throw error;  

if (data && data.length > 0) {  
    const cliente = data[0];  

    if (telefone && cliente.telefone !== telefone) {  
        const { error: erroAtualizacao } = await supabaseClient  
            .from("clientes")  
            .update({ telefone })  
            .eq("id", cliente.id);  

        if (erroAtualizacao) throw erroAtualizacao;  
    }  

    return cliente;  
}  

const { data: novoCliente, error: erroCriacao } =  
    await supabaseClient  
        .from("clientes")  
        .insert({  
            nome: nomeNormalizado,  
            telefone: telefone || null  
        })  
        .select()  
        .single();  

if (erroCriacao) throw erroCriacao;  

return novoCliente;

}

// =====================================================
// REGISTRAR VENDA
// =====================================================

async function registrarVenda(event) {
event.preventDefault();

if (salvandoVenda) return;  

if (itensVenda.length === 0) {  
    alert("Adicione pelo menos um produto.");  
    return;  
}  

const nome =  
    elemento("customer-name")?.value.trim() || "";  

const telefone =  
    elemento("customer-phone")?.value.trim() || "";  

const formaPagamento =  
    elemento("payment-method")?.value || "";  

const observacao =  
    elemento("sale-observation")?.value.trim() || "";  

if (!nome) {  
    alert("Informe o nome do cliente.");  
    return;  
}  

const formasPermitidas = [  
    "dinheiro",  
    "pix",  
    "cartao",  
    "fiado",  
    "parcelado"  
];  

if (!formasPermitidas.includes(formaPagamento)) {  
    alert("Selecione uma forma de pagamento válida.");  
    return;  
}  

let quantidadeParcelas = null;  

if (formaPagamento === "parcelado") {  
    quantidadeParcelas = obterQuantidadeParcelas();  

    if (!quantidadeParcelas) {  
        alert(  
            "Selecione uma quantidade entre 2 e 12 parcelas."  
        );  

        return;  
    }  

    if (calcularTotal() <= 0) {  
        alert("O valor da venda precisa ser maior que zero.");  
        return;  
    }  
}  

const itens = itensVenda.map(item => ({  
    produto_id: item.produto_id,  
    quantidade: item.quantidade  
}));  

const button = elemento("save-sale-button");  

const controles = Array.from(  
    saleForm?.elements || []  
).map(el => ({  
    el,  
    disabled: el.disabled  
}));  

let registrada = false;  

salvandoVenda = true;  

controles.forEach(({ el }) => {  
    el.disabled = true;  
});  

if (button) {  
    button.disabled = true;  
    button.textContent = "Registrando...";  
}  

try {  
    const cliente = await obterCliente(nome, telefone);  

    let resultado;  

    if (formaPagamento === "parcelado") {  
        resultado = await supabaseClient.rpc(  
            "registrar_venda_parcelada",  
            {  
                p_cliente_id: cliente.id,  
                p_observacao: observacao || null,  
                p_itens: itens,  
                p_quantidade_parcelas: quantidadeParcelas  
            }  
        );  
    } else {  
        resultado = await supabaseClient.rpc(  
            "registrar_venda",  
            {  
                p_cliente_id: cliente.id,  
                p_forma_pagamento: formaPagamento,  
                p_observacao: observacao || null,  
                p_itens: itens  
            }  
        );  
    }  

    if (resultado.error) {  
        if (  
            formaPagamento === "parcelado" &&  
            rpcAusente(resultado.error)  
        ) {  
            throw new Error(  
                "O parcelamento ainda não está configurado no banco. " +  
                "Configure a função registrar_venda_parcelada no Supabase."  
            );  
        }  

        throw resultado.error;  
    }  

    registrada = true;  
    itensVenda = [];  

    if (formaPagamento === "fiado") {  
        alert("Fiado registrado com sucesso!");  
    } else if (formaPagamento === "parcelado") {  
        alert(  
            `Venda parcelada em ${quantidadeParcelas} vezes registrada com sucesso!\n\n` +  
            `Total: R$ ${formatarMoeda(calcularParcelasTotal(itens))}\n` +  
            `${obterResumoParcelas(calcularParcelasTotal(itens), quantidadeParcelas)}`  
        );  
    } else {  
        alert("Venda registrada com sucesso!");  
    }  

    fecharModalVenda(true);  

    await carregarProdutos();  
    await carregarVendas();  
    await atualizarResumo();  

    atualizarPreviewRelatorio();  

} catch (error) {  
    console.error("Erro ao registrar venda:", error);  

    alert(  
        registrada  
            ? "A venda foi registrada, mas a tela não atualizou. Recarregue a página; não registre novamente."  
            : (  
                error.message ||  
                "Não foi possível confirmar o registro. Recarregue e confira as vendas antes de tentar novamente."  
            )  
    );  
} finally {  
    salvandoVenda = false;  

    controles.forEach(({ el, disabled }) => {  
        el.disabled = disabled;  
    });  

    if (button) {  
        button.disabled = false;  
        button.textContent = "Registrar venda";  
    }  
}

}

function calcularParcelasTotal(itens) {
return itens.reduce((total, item) => {
const produto = produtos.find(
p => String(p.id) === String(item.produto_id)
);

if (!produto) return total;  

    return total +  
        Math.round(numero(produto.preco) * 100) *  
        numero(item.quantidade);  
}, 0) / 100;

}

// =====================================================
// CARREGAR VENDAS
// =====================================================

async function carregarVendas() {
    if (salesList) {
        salesList.innerHTML = `
            <div class="empty-sales">Carregando vendas...</div>
        `;
    }

    const { data: vendasData, error: vendasError } =
        await supabaseClient
            .from("vendas")
            .select("*")
            .order("criado_em", { ascending: false });

if (vendasError) {  
    console.error("Erro ao carregar vendas:", vendasError);  

    if (salesList) {  
        salesList.innerHTML = `  
            <div class="empty-sales">Erro ao carregar as vendas.</div>  
        `;  
    }  

    return;  
}  

if (!vendasData || vendasData.length === 0) {  
    vendas = [];  
    renderizarVendas();  
    return;  
}  

const clienteIds = [  
    ...new Set(  
        vendasData  
            .map(venda => venda.cliente_id)  
            .filter(id => id !== null && id !== undefined)  
    )  
];  

let clientes = [];  

if (clienteIds.length > 0) {  
    const { data, error } = await supabaseClient  
        .from("clientes")  
        .select("id, nome, telefone")  
        .in("id", clienteIds);  

    if (error) {  
        console.error("Erro ao carregar clientes:", error);  
    } else {  
        clientes = data || [];  
    }  
}  

const vendaIds = vendasData.map(venda => venda.id);  

const { data: itensData, error: itensError } =  
    await supabaseClient  
        .from("itens_venda")  
        .select("*")  
        .in("venda_id", vendaIds);  

if (itensError) {  
    console.error("Erro ao carregar itens das vendas:", itensError);  
}  

const itens = itensData || [];  

const produtoIds = [  
    ...new Set(  
        itens  
            .map(item => item.produto_id)  
            .filter(id => id !== null && id !== undefined)  
    )  
];  

let produtosVenda = [];  

if (produtoIds.length > 0) {  
    const { data, error } = await supabaseClient  
        .from("produtos")  
        .select("id, nome, imagem_url, categoria, tamanho, cor")  
        .in("id", produtoIds);  

    if (error) {  
        console.error("Erro ao carregar produtos das vendas:", error);  
    } else {  
        produtosVenda = data || [];  
    }  
}  

vendas = vendasData.map(venda => {  
    const cliente = clientes.find(  
        item => String(item.id) === String(venda.cliente_id)  
    ) || null;  

    const itensDaVenda = itens  
        .filter(  
            item => String(item.venda_id) === String(venda.id)  
        )  
        .map(item => {  
            const produto = produtosVenda.find(  
                p => String(p.id) === String(item.produto_id)  
            ) || null;  

            return {  
                ...item,  
                produtos: produto  
            };  
        });  

    return {  
        ...venda,  
        clientes: cliente,  
        itens_venda: itensDaVenda  
    };  
});  

renderizarVendas();

}

// =====================================================
// RENDERIZAR VENDAS
// =====================================================

function renderizarVendas() {
if (!salesList) return;

const pesquisa = (  
    elemento("sales-search")?.value || ""  
).toLowerCase().trim();  

let lista = [...vendas];  

if (abaAtual === "pendentes") {  
    lista = lista.filter(vendaEstaPendente);  
}  

if (pesquisa) {  
    lista = lista.filter(venda => {  
        const nome =  
            venda.clientes?.nome?.toLowerCase() || "";  

        const telefone =  
            venda.clientes?.telefone || "";  

        return (  
            nome.includes(pesquisa) ||  
            telefone.includes(pesquisa)  
        );  
    });  
}  

if (lista.length === 0) {  
    salesList.innerHTML = `  
        <div class="empty-sales">Nenhuma venda encontrada.</div>  
    `;  

    return;  
}  

salesList.innerHTML = "";  

lista.forEach(venda => {  
    const card = document.createElement("div");  

    card.className = "sale-card";  

    const nome =  
        venda.clientes?.nome || "Cliente não informado";  

    const data = formatarData(venda.criado_em);  

    const statusPago = vendaEstaPaga(venda);  

    const quantidadeParcelas =  
        numero(venda.quantidade_parcelas);  

    const resumoParcelamento =  
        venda.forma_pagamento === "parcelado"  
            ? `  
                <span class="sale-installments">  
                    ${quantidadeParcelas > 0  
                        ? `${quantidadeParcelas} parcelas`  
                        : "Venda parcelada"}  
                </span>  
            `  
            : "";  

    card.innerHTML = `  
        <div class="sale-card-top">  
            <div>  
                <span class="sale-client">  
                    ${escaparHTML(nome)}  
                </span>  

                <small>${escaparHTML(data)}</small>  
            </div>  

            <strong>  
                R$ ${formatarMoeda(venda.valor_total)}  
            </strong>  
        </div>  

        <div class="sale-card-bottom">  
            <div>  
                <span>  
                    ${escaparHTML(formatarPagamento(venda.forma_pagamento))}  
                </span>  

                ${resumoParcelamento}  
            </div>  

            <span class="${statusPago ? "status-paid" : "status-pending"}">  
                ${statusPago ? "✓ Pago" : "● Não pago"}  
            </span>  
        </div>  
    `;  

    card.addEventListener("click", () => {  
        abrirDetalhes(venda);  
    });  

    salesList.appendChild(card);  
});

}

// =====================================================
// DETALHES DA VENDA
// =====================================================

function abrirDetalhes(venda) {
if (excluindoVenda || atualizandoPagamento) return;

vendaEmDetalhes = venda;  

const nome =  
    venda.clientes?.nome || "Cliente não informado";  

const telefone =  
    venda.clientes?.telefone || "Não informado";  

const data = formatarData(venda.criado_em, true);  

const pago = vendaEstaPaga(venda);  

const detalhes = elemento("sale-details");  

if (!detalhes) return;  

const itensHTML = (venda.itens_venda || [])  
    .map(item => {  
        const produto = item.produtos;  

        const nomeProduto =  
            obterNomeProduto(produto);  

        return `  
            <div class="detail-item">  
                <div>  
                    <strong>  
                        ${escaparHTML(nomeProduto)}  
                    </strong>  

                    <span>  
                        ${numero(item.quantidade)} ×  
                        R$ ${formatarMoeda(item.preco_unitario)}  
                    </span>  
                </div>  

                <strong>  
                    R$ ${formatarMoeda(item.subtotal)}  
                </strong>  
            </div>  
        `;  
    })  
    .join("");  

const observacaoHTML = venda.observacao  
    ? `  
        <div class="sale-note">  
            <strong>Observação</strong>  
            <p>${escaparHTML(venda.observacao)}</p>  
        </div>  
    `  
    : "";  

const botaoPagamento = (  
    !pago &&  
    ["fiado", "parcelado"].includes(venda.forma_pagamento)  
)  
    ? `  
        <button  
            type="button"  
            class="primary-button"  
            id="mark-paid-button"  
        >  
            ✓ Marcar venda inteira como paga  
        </button>  
    `  
    : "";  

const quantidadeParcelas =  
    numero(venda.quantidade_parcelas);  

let informacaoParcelas = "";  

if (venda.forma_pagamento === "parcelado") {  
    if (quantidadeParcelas >= 2) {  
        const parcelas = calcularParcelas(  
            venda.valor_total,  
            quantidadeParcelas  
        );  

        const valoresUnicos = [...new Set(parcelas)];  

        const resumo = valoresUnicos.length === 1  
            ? `${quantidadeParcelas}x de R$ ${formatarMoeda(parcelas[0])}`  
            : `${quantidadeParcelas} parcelas, de R$ ${formatarMoeda(Math.min(...parcelas))} a R$ ${formatarMoeda(Math.max(...parcelas))}`;  

        informacaoParcelas = `  
            <div class="installment-details">  
                <p>  
                    <strong>Quantidade de parcelas:</strong>  
                    ${quantidadeParcelas}x  
                </p>  

                <p>  
                    <strong>Valor das parcelas:</strong>  
                    ${escaparHTML(resumo)}  
                </p>  

                <div class="installment-list">  
                    ${parcelas.map((valor, index) => `  
                        <div class="installment-row">  
                            <span>Parcela ${index + 1}/${quantidadeParcelas}</span>  
                            <strong>R$ ${formatarMoeda(valor)}</strong>  
                        </div>  
                    `).join("")}  
                </div>  
            </div>  
        `;  
    } else {  
        informacaoParcelas = `  
            <p>  
                <strong>Parcelamento:</strong>  
                Quantidade não informada  
            </p>  
        `;  
    }  
}  

detalhes.innerHTML = `  
    <span class="section-label">DETALHES DA VENDA</span>  

    <h2>${escaparHTML(nome)}</h2>  

    <div class="details-info">  
        <p>  
            <strong>Telefone:</strong>  
            ${escaparHTML(telefone)}  
        </p>  

        <p>  
            <strong>Data:</strong>  
            ${escaparHTML(data)}  
        </p>  

        ${informacaoParcelas}  
    </div>  

    <h3>Produtos</h3>  

    <div class="details-items">  
        ${itensHTML || "<p>Nenhum item encontrado.</p>"}  
    </div>  

    <div class="details-total">  
        <span>Total</span>  

        <strong>  
            R$ ${formatarMoeda(venda.valor_total)}  
        </strong>  
    </div>  

    <div class="details-payment">  
        <span>  
            ${escaparHTML(formatarPagamento(venda.forma_pagamento))}  
        </span>  

        <strong class="${pago ? "status-paid" : "status-pending"}">  
            ${pago ? "✓ PAGO" : "● NÃO PAGO"}  
        </strong>  
    </div>  

    ${observacaoHTML}  

    ${botaoPagamento}  

    <button  
        type="button"  
        class="delete-sale-button"  
        id="delete-sale-button"  
    >  
        Excluir venda  
    </button>  
`;  

elemento("mark-paid-button")?.addEventListener(  
    "click",  
    () => marcarComoPago(venda.id)  
);  

elemento("delete-sale-button")?.addEventListener(  
    "click",  
    () => excluirVenda(venda.id)  
);  

detailsModal?.classList.add("show");

}

// =====================================================
// MARCAR VENDA COMO PAGA
// =====================================================

async function marcarComoPago(vendaId) {
if (atualizandoPagamento || excluindoVenda) return;

if (  
    !confirm(  
        "Confirmar o recebimento integral desta venda?"  
    )  
) {  
    return;  
}  

atualizandoPagamento = true;  

const botao = elemento("mark-paid-button");  

if (botao) {  
    botao.disabled = true;  
    botao.textContent = "Atualizando...";  
}  

let confirmado = false;  

try {  
    const { error } = await supabaseClient.rpc(  
        "marcar_venda_paga",  
        {  
            p_venda_id: vendaId  
        }  
    );  

    if (error) throw error;  

    confirmado = true;  

    alert("Venda marcada como paga!");  

    fecharDetalhes(true);  

    await carregarVendas();  
    await atualizarResumo();  

    atualizarPreviewRelatorio();  

} catch (error) {  
    mostrarErro(  
        confirmado  
            ? "Pagamento salvo, mas a tela não atualizou. Recarregue a página."  
            : "Não foi possível confirmar o pagamento. Confira a venda antes de tentar novamente.",  
        error  
    );  
} finally {  
    atualizandoPagamento = false;  

    if (botao) {  
        botao.disabled = false;  
        botao.textContent = "✓ Marcar venda inteira como paga";  
    }  
}

}

// =====================================================
// EXCLUIR VENDA
// =====================================================

async function excluirVenda(vendaId) {
if (excluindoVenda || atualizandoPagamento) return;

const venda = vendas.find(  
    item => String(item.id) === String(vendaId)  
);  

if (!venda) {  
    alert("Venda não encontrada.");  
    return;  
}  

const cliente =  
    venda.clientes?.nome || "Cliente não informado";  

const confirmar = confirm(  
    `Deseja excluir esta venda?\n\n` +  
    `Cliente: ${cliente}\n` +  
    `Valor: R$ ${formatarMoeda(venda.valor_total)}\n\n` +  
    `Essa ação não poderá ser desfeita.`  
);  

if (!confirmar) return;  

excluindoVenda = true;  

let excluida = false;  

const botao = elemento("delete-sale-button");  

if (botao) {  
    botao.disabled = true;  
    botao.textContent = "Excluindo...";  
}  

try {  
    const { error } = await supabaseClient.rpc(  
        "excluir_venda",  
        {  
            p_venda_id: vendaId  
        }  
    );  

    if (error) {  
        if (rpcAusente(error)) {  
            throw new Error(  
                "Exclusão ainda não configurada no banco. " +  
                "Configure excluir_venda no Supabase, incluindo os itens e o estoque."  
            );  
        }  

        throw error;  
    }  

    excluida = true;  

    alert("Venda excluída com sucesso!");  

    fecharDetalhes(true);  

    await carregarProdutos();  
    await carregarVendas();  
    await atualizarResumo();  

    atualizarPreviewRelatorio();  

} catch (error) {  
    mostrarErro(  
        excluida  
            ? "Venda excluída, mas a tela não atualizou. Recarregue a página."  
            : "Não foi possível confirmar a exclusão. Confira a venda antes de tentar novamente.",  
        error  
    );  
} finally {  
    excluindoVenda = false;  

    if (botao) {  
        botao.disabled = false;  
        botao.textContent = "Excluir venda";  
    }  
}

}

// =====================================================
// RESUMO
// =====================================================

async function atualizarResumo() {
const hoje = new Date();

const inicio = new Date(  
    hoje.getFullYear(),  
    hoje.getMonth(),  
    hoje.getDate()  
);  

const vendasHoje = vendas.filter(venda => {  
    const data = new Date(venda.criado_em);  

    return (  
        !Number.isNaN(data.getTime()) &&  
        data >= inicio  
    );  
});  

const totalHoje = vendasHoje.reduce(  
    (total, venda) => total + numero(venda.valor_total),  
    0  
);  

const pendentes = vendas.filter(vendaEstaPendente);  

const totalPendente = pendentes.reduce(  
    (total, venda) => total + numero(venda.valor_total),  
    0  
);  

texto("sales-today", `R$ ${formatarMoeda(totalHoje)}`);  
texto("sales-count", vendas.length);  
texto("pending-value", `R$ ${formatarMoeda(totalPendente)}`);

}

// =====================================================
// MODAIS
// =====================================================

function abrirModalVenda() {
if (salvandoVenda) return;

itensVenda = [];  

saleForm?.reset();  

renderizarItens();  

configurarVisibilidadeParcelamento();  

saleModal?.classList.add("show");

}

function configurarVisibilidadeParcelamento() {
const pagamento = elemento("payment-method");
const opcoes = elemento("installment-options");

if (!pagamento || !opcoes) return;  

opcoes.style.display =  
    pagamento.value === "parcelado"  
        ? "block"  
        : "none";  

atualizarValorParcela();

}

function fecharModalVenda(forcar = false) {
if (salvandoVenda && forcar !== true) return;

saleModal?.classList.remove("show");

}

function fecharDetalhes(forcar = false) {
if (
(excluindoVenda || atualizandoPagamento) &&
forcar !== true
) {
return;
}

detailsModal?.classList.remove("show");  

vendaEmDetalhes = null;

}

// =====================================================
// EVENTOS PRINCIPAIS
// =====================================================

function configurarEventos() {
if (saleProduct) {
saleProduct.required = false;
}

elemento("open-sale-button")?.addEventListener(  
    "click",  
    abrirModalVenda  
);  

elemento("close-sale-modal")?.addEventListener(  
    "click",  
    fecharModalVenda  
);  

elemento("close-details-modal")?.addEventListener(  
    "click",  
    fecharDetalhes  
);  

elemento("add-sale-product")?.addEventListener(  
    "click",  
    adicionarProdutoVenda  
);  

saleItems?.addEventListener("click", event => {  
    const botao = event.target.closest(  
        "[data-remover-item]"  
    );  

    if (!botao) return;  

    removerItem(Number(botao.dataset.removerItem));  
});  

saleForm?.addEventListener(  
    "submit",  
    registrarVenda  
);  

elemento("logout-button")?.addEventListener(  
    "click",  
    sair  
);  

elemento("sales-search")?.addEventListener(  
    "input",  
    renderizarVendas  
);  

elemento("tab-sales")?.addEventListener("click", () => {  
    abaAtual = "todas";  

    elemento("tab-sales")?.classList.add("active");  
    elemento("tab-pending")?.classList.remove("active");  

    renderizarVendas();  
});  

elemento("tab-pending")?.addEventListener("click", () => {  
    abaAtual = "pendentes";  

    elemento("tab-pending")?.classList.add("active");  
    elemento("tab-sales")?.classList.remove("active");  

    renderizarVendas();  
});  

configurarParcelamento();  

configurarEventosRelatorios();  

detailsModal?.addEventListener("click", event => {  
    if (event.target === detailsModal) {  
        fecharDetalhes();  
    }  
});  

saleModal?.addEventListener("click", event => {  
    if (event.target === saleModal) {  
        fecharModalVenda();  
    }  
});

}

// =====================================================
// FORMATAÇÃO DO PAGAMENTO
// =====================================================

function formatarPagamento(pagamento) {
const nomes = {
pix: "Pix",
dinheiro: "Dinheiro",
cartao: "Cartão",
fiado: "Fiado",
parcelado: "Parcelado"
};

return nomes[pagamento] || pagamento || "Não informado";

}

// =====================================================
// RELATÓRIOS — FILTRAGEM
// =====================================================

function abrirModalRelatorio() {
const hoje = new Date();

const hojeFormatado = dataLocalISO(hoje);  

if (reportStartDate && !reportStartDate.value) {  
    reportStartDate.value =  
        `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;  
}  

if (reportEndDate && !reportEndDate.value) {  
    reportEndDate.value = hojeFormatado;  
}  

atualizarPreviewRelatorio();  

reportModal?.classList.add("show");

}

function fecharModalRelatorio() {
reportModal?.classList.remove("show");
}

function obterVendasRelatorio() {
const inicio = reportStartDate?.value
? new Date(${reportStartDate.value}T00:00:00)
: null;

const fim = reportEndDate?.value  
    ? new Date(`${reportEndDate.value}T23:59:59.999`)  
    : null;  

const status = reportStatus?.value || "todas";  

return vendas.filter(venda => {  
    const dataVenda = new Date(venda.criado_em);  

    if (Number.isNaN(dataVenda.getTime())) {  
        return false;  
    }  

    if (inicio && dataVenda < inicio) {  
        return false;  
    }  

    if (fim && dataVenda > fim) {  
        return false;  
    }  

    if (  
        status === "pagas" &&  
        !vendaEstaPaga(venda)  
    ) {  
        return false;  
    }  

    if (  
        status === "pendentes" &&  
        !vendaEstaPendente(venda)  
    ) {  
        return false;  
    }  

    return true;  
});

}

// =====================================================
// ATUALIZAR PREVIEW DO RELATÓRIO
// =====================================================

function atualizarPreviewRelatorio() {
const lista = obterVendasRelatorio();

const total = lista.reduce(  
    (soma, venda) => soma + numero(venda.valor_total),  
    0  
);  

const pendente = lista.reduce((soma, venda) => {  
    if (vendaEstaPendente(venda)) {  
        return soma + numero(venda.valor_total);  
    }  

    return soma;  
}, 0);  

texto("report-count", lista.length);  
texto("report-total", `R$ ${formatarMoeda(total)}`);  
texto("report-pending", `R$ ${formatarMoeda(pendente)}`);  

if (reportMessage) {  
    reportMessage.textContent = lista.length  
        ? `${lista.length} venda(s) encontrada(s).`  
        : "Nenhuma venda encontrada para os filtros selecionados.";  
}

}

// =====================================================
// PREPARAR DADOS DO RELATÓRIO
// =====================================================

function prepararDadosRelatorio() {
return obterVendasRelatorio().map(venda => {
const produtosTexto = (venda.itens_venda || [])
.map(item => {
const nome = obterNomeProduto(item.produtos);

return `${item.quantidade}x ${nome}`;  
        })  
        .join(", ");  

    const quantidadeParcelas =  
        numero(venda.quantidade_parcelas);  

    let pagamento = formatarPagamento(  
        venda.forma_pagamento  
    );  

    if (  
        venda.forma_pagamento === "parcelado" &&  
        quantidadeParcelas > 0  
    ) {  
        pagamento += ` (${quantidadeParcelas} parcelas)`;  
    }  

    return {  
        data: formatarData(venda.criado_em),  
        cliente: venda.clientes?.nome || "Não informado",  
        produtos: produtosTexto,  
        pagamento,  
        status: vendaEstaPaga(venda)  
            ? "Pago"  
            : "Não pago",  
        valor: numero(venda.valor_total)  
    };  
});

}

// =====================================================
// EXPORTAR EXCEL
// =====================================================

function exportarExcel() {
if (typeof XLSX === "undefined") {
alert("A biblioteca XLSX não foi carregada.");
return;
}

const dados = prepararDadosRelatorio();  

if (dados.length === 0) {  
    alert(  
        "Nenhuma venda encontrada para o período selecionado."  
    );  

    return;  
}  

const total = dados.reduce(  
    (soma, venda) => soma + venda.valor,  
    0  
);  

const pendente = dados.reduce((soma, venda) => {  
    return venda.status === "Não pago"  
        ? soma + venda.valor  
        : soma;  
}, 0);  

const linhas = [  
    ["MARY BOUTIQUE"],  
    ["RELATÓRIO DE VENDAS"],  
    [],  
    ["Período inicial", reportStartDate?.value || "Todos"],  
    ["Período final", reportEndDate?.value || "Todos"],  
    [],  
    ["Quantidade de vendas", dados.length],  
    ["Total vendido", total],  
    ["Valores não pagos", pendente],  
    [],  
    ["Data", "Cliente", "Produtos", "Pagamento", "Status", "Valor"]  
];  

dados.forEach(venda => {  
    linhas.push([  
        venda.data,  
        venda.cliente,  
        venda.produtos,  
        venda.pagamento,  
        venda.status,  
        venda.valor  
    ]);  
});  

const worksheet = XLSX.utils.aoa_to_sheet(linhas);  

worksheet["!cols"] = [  
    { wch: 14 },  
    { wch: 25 },  
    { wch: 45 },  
    { wch: 25 },  
    { wch: 15 },  
    { wch: 15 }  
];  

const workbook = XLSX.utils.book_new();  

XLSX.utils.book_append_sheet(  
    workbook,  
    worksheet,  
    "Vendas"  
);  

const inicio = reportStartDate?.value || "inicio";  
const fim = reportEndDate?.value || "fim";  

XLSX.writeFile(  
    workbook,  
    `Mary-Boutique-Vendas-${inicio}-ate-${fim}.xlsx`  
);

}

// =====================================================
// EXPORTAR PDF
// =====================================================

function exportarPDF() {
if (!window.jspdf?.jsPDF) {
alert("A biblioteca jsPDF não foi carregada.");
return;
}

const dados = prepararDadosRelatorio();  

if (dados.length === 0) {  
    alert(  
        "Nenhuma venda encontrada para o período selecionado."  
    );  

    return;  
}  

const { jsPDF } = window.jspdf;  

const doc = new jsPDF({  
    orientation: "landscape",  
    unit: "mm",  
    format: "a4"  
});  

const total = dados.reduce(  
    (soma, venda) => soma + venda.valor,  
    0  
);  

const recebido = dados.reduce((soma, venda) => {  
    return venda.status === "Pago"  
        ? soma + venda.valor  
        : soma;  
}, 0);  

const pendente = dados.reduce((soma, venda) => {  
    return venda.status === "Não pago"  
        ? soma + venda.valor  
        : soma;  
}, 0);  

doc.setFontSize(20);  
doc.setFont("helvetica", "bold");  
doc.text("MARY BOUTIQUE", 14, 18);  

doc.setFontSize(13);  
doc.setFont("helvetica", "normal");  
doc.text("Relatório de Vendas", 14, 27);  

doc.setFontSize(9);  

doc.text(  
    `Período: ${reportStartDate?.value || "Todos"} até ${reportEndDate?.value || "Todos"}`,  
    14,  
    35  
);  

doc.setFontSize(10);  

doc.text(`Vendas: ${dados.length}`, 14, 45);  

doc.text(  
    `Total vendido: R$ ${formatarMoeda(total)}`,  
    70,  
    45  
);  

doc.text(  
    `Recebido: R$ ${formatarMoeda(recebido)}`,  
    145,  
    45  
);  

doc.text(  
    `Valores não pagos: R$ ${formatarMoeda(pendente)}`,  
    215,  
    45  
);  

const tabela = dados.map(venda => [  
    venda.data,  
    venda.cliente,  
    venda.produtos,  
    venda.pagamento,  
    venda.status,  
    `R$ ${formatarMoeda(venda.valor)}`  
]);  

if (typeof doc.autoTable !== "function") {  
    alert(  
        "O plugin AutoTable do jsPDF não foi carregado."  
    );  

    return;  
}  

doc.autoTable({  
    startY: 53,  

    head: [[  
        "Data",  
        "Cliente",  
        "Produtos",  
        "Pagamento",  
        "Status",  
        "Valor"  
    ]],  

    body: tabela,  

    theme: "grid",  

    styles: {  
        fontSize: 8,  
        cellPadding: 3  
    },  

    headStyles: {  
        fontStyle: "bold"  
    },  

    columnStyles: {  
        0: { cellWidth: 25 },  
        1: { cellWidth: 40 },  
        2: { cellWidth: 90 },  
        3: { cellWidth: 30 },  
        4: { cellWidth: 30 },  
        5: { cellWidth: 30 }  
    },  

    didDrawPage: () => {  
        const altura = doc.internal.pageSize.getHeight();  

        const largura = doc.internal.pageSize.getWidth();  

        doc.setFontSize(8);  

        doc.text(  
            "Mary Boutique — Relatório gerado pelo sistema",  
            14,  
            altura - 8  
        );  

        doc.text(  
            `Página ${doc.internal.getNumberOfPages()}`,  
            largura - 30,  
            altura - 8  
        );  
    }  
});  

const inicio = reportStartDate?.value || "inicio";  
const fim = reportEndDate?.value || "fim";  

doc.save(  
    `Mary-Boutique-Vendas-${inicio}-ate-${fim}.pdf`  
);

}

// =====================================================
// EVENTOS DOS RELATÓRIOS
// =====================================================

function configurarEventosRelatorios() {
elemento("open-report-button")?.addEventListener(
"click",
abrirModalRelatorio
);

elemento("close-report-modal")?.addEventListener(  
    "click",  
    fecharModalRelatorio  
);  

reportModal?.addEventListener("click", event => {  
    if (event.target === reportModal) {  
        fecharModalRelatorio();  
    }  
});  

reportStartDate?.addEventListener(  
    "change",  
    atualizarPreviewRelatorio  
);  

reportEndDate?.addEventListener(  
    "change",  
    atualizarPreviewRelatorio  
);  

reportStatus?.addEventListener(  
    "change",  
    atualizarPreviewRelatorio  
);  

elemento("export-excel-button")?.addEventListener(  
    "click",  
    exportarExcel  
);  

elemento("export-pdf-button")?.addEventListener(  
    "click",  
    exportarPDF  
);  
                }
