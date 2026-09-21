let produtos = [];
let itensVenda = [];

let vendas = [];

let abaAtual = "todas";


// =====================================================
// ELEMENTOS
// =====================================================

const saleModal =
    document.getElementById("sale-modal");

const detailsModal =
    document.getElementById("details-modal");

const saleForm =
    document.getElementById("sale-form");

const salesList =
    document.getElementById("sales-list");

const saleProduct =
    document.getElementById("sale-product");

const saleQuantity =
    document.getElementById("sale-quantity");

const saleItems =
    document.getElementById("sale-items");

const saleTotal =
    document.getElementById("sale-total");


// =====================================================
// INICIALIZAÇÃO
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

    await verificarUsuario();

    await carregarProdutos();

    await carregarVendas();

    await atualizarResumo();

    configurarEventos();

});


// =====================================================
// VERIFICAR LOGIN
// =====================================================

async function verificarUsuario() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();


    if (!user) {

        window.location.href = "index.html";

    }

}


// =====================================================
// LOGOUT
// =====================================================

async function sair() {

    await supabaseClient.auth.signOut();

    window.location.href = "index.html";

}


// =====================================================
// CARREGAR PRODUTOS
// =====================================================

async function carregarProdutos() {

    const { data, error } = await supabaseClient
        .from("produtos")
        .select("id, nome, preco, quantidade")
        .order("nome", {
            ascending: true
        });


    if (error) {

        console.error(
            "Erro ao carregar produtos:",
            error
        );

        saleProduct.innerHTML = `
            <option value="">
                Erro ao carregar produtos
            </option>
        `;

        return;

    }


    produtos = data || [];


    saleProduct.innerHTML = `
        <option value="">
            Selecione um produto
        </option>
    `;


    // Mostrar somente produtos que possuem estoque
    produtos
        .filter(produto =>
            Number(produto.quantidade) > 0
        )
        .forEach(produto => {

            const option =
                document.createElement("option");


            option.value =
                produto.id;


            option.textContent =
                `${produto.nome} — R$ ${formatarMoeda(produto.preco)} (${produto.quantidade} disponíveis)`;


            saleProduct.appendChild(option);

        });

}


// =====================================================
// ADICIONAR PRODUTO À VENDA
// =====================================================

function adicionarProdutoVenda() {

    const produtoId =
        Number(saleProduct.value);


    const quantidade =
        Number(saleQuantity.value);


    if (!produtoId) {

        alert("Selecione um produto.");

        return;

    }


    if (!quantidade || quantidade <= 0) {

        alert("Informe uma quantidade válida.");

        return;

    }


    const produto =
        produtos.find(p => p.id === produtoId);


    if (!produto) return;


    if (quantidade > produto.quantidade) {

        alert(
            `Estoque insuficiente. Existem apenas ${produto.quantidade} unidades.`
        );

        return;

    }


    const itemExistente =
        itensVenda.find(
            item => item.produto_id === produtoId
        );


    if (itemExistente) {

        const novaQuantidade =
            itemExistente.quantidade + quantidade;


        if (novaQuantidade > produto.quantidade) {

            alert(
                `Você não possui essa quantidade em estoque.`
            );

            return;

        }


        itemExistente.quantidade =
            novaQuantidade;

    } else {

        itensVenda.push({

            produto_id: produto.id,

            nome: produto.name,

            quantidade: quantidade,

            preco: Number(produto.preco)

        });

    }


    renderizarItens();

    saleProduct.value = "";

    saleQuantity.value = 1;

}


// =====================================================
// RENDERIZAR ITENS
// =====================================================

function renderizarItens() {

    if (itensVenda.length === 0) {

        saleItems.innerHTML = `
            <p class="empty-sale">
                Nenhum produto adicionado.
            </p>
        `;

        atualizarTotal();

        return;

    }


    saleItems.innerHTML = "";


    itensVenda.forEach((item, index) => {

        const subtotal =
            item.preco * item.quantidade;


        const div =
            document.createElement("div");


        div.className =
            "sale-item";


        div.innerHTML = `

            <div>

                <strong>
                    ${item.nome}
                </strong>

                <span>
                    ${item.quantidade} ×
                    R$ ${formatarMoeda(item.preco)}
                </span>

            </div>


            <div class="sale-item-right">

                <strong>
                    R$ ${formatarMoeda(subtotal)}
                </strong>

                <button
                    type="button"
                    class="remove-item"
                    onclick="removerItem(${index})"
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

    itensVenda.splice(index, 1);

    renderizarItens();

}


// =====================================================
// TOTAL
// =====================================================

function calcularTotal() {

    return itensVenda.reduce(
        (total, item) =>
            total + (item.preco * item.quantidade),
        0
    );

}


function atualizarTotal() {

    saleTotal.textContent =
        `R$ ${formatarMoeda(calcularTotal())}`;

}


// =====================================================
// CRIAR / ENCONTRAR CLIENTE
// =====================================================

async function obterCliente(nome, telefone) {

    const nomeNormalizado =
        nome.trim();


    let query =
        supabaseClient
            .from("clientes")
            .select("*")
            .eq("nome", nomeNormalizado)
            .limit(1);


    const { data, error } =
        await query;


    if (error) {

        console.error(error);

        return null;

    }


    if (data && data.length > 0) {

        const cliente = data[0];


        if (telefone && cliente.telefone !== telefone) {

            await supabaseClient
                .from("clientes")
                .update({
                    telefone: telefone
                })
                .eq("id", cliente.id);

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


    if (erroCriacao) {

        console.error(erroCriacao);

        return null;

    }


    return novoCliente;

}


// =====================================================
// REGISTRAR VENDA
// =====================================================

async function registrarVenda(event) {

    event.preventDefault();


    if (itensVenda.length === 0) {

        alert("Adicione pelo menos um produto.");

        return;

    }


    const nome =
        document
            .getElementById("customer-name")
            .value
            .trim();


    const telefone =
        document
            .getElementById("customer-phone")
            .value
            .trim();


    const formaPagamento =
        document
            .getElementById("payment-method")
            .value;


    const observacao =
        document
            .getElementById("sale-observation")
            .value
            .trim();


    const button =
        document.getElementById(
            "save-sale-button"
        );


    button.disabled = true;

    button.textContent =
        "Registrando...";


    try {

        const cliente =
            await obterCliente(
                nome,
                telefone
            );


        if (!cliente) {

            throw new Error(
                "Não foi possível criar o cliente."
            );

        }


        const itens =
            itensVenda.map(item => ({

                produto_id:
                    item.produto_id,

                quantidade:
                    item.quantidade

            }));


        const { data, error } =
            await supabaseClient.rpc(
                "registrar_venda",
                {

                    p_cliente_id:
                        cliente.id,

                    p_forma_pagamento:
                        formaPagamento,

                    p_observacao:
                        observacao || null,

                    p_itens:
                        itens

                }
            );


        if (error) {

            throw error;

        }


        alert(
            formaPagamento === "fiado"
                ? "Fiado registrado com sucesso!"
                : "Venda registrada com sucesso!"
        );


        fecharModalVenda();


        await carregarProdutos();

        await carregarVendas();

        await atualizarResumo();


    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            "Erro ao registrar venda."
        );

    }


    button.disabled = false;

    button.textContent =
        "Registrar venda";

}


// =====================================================
// CARREGAR VENDAS
// =====================================================

async function carregarVendas() {

    console.log("Carregando vendas...");


    // =====================================================
    // BUSCAR VENDAS
    // =====================================================

    const {
        data: vendasData,
        error: vendasError
    } = await supabaseClient

        .from("vendas")

        .select("*")

        .order("criado_em", {
            ascending: false
        });


    if (vendasError) {

        console.error(
            "ERRO AO CARREGAR VENDAS:",
            vendasError
        );

        salesList.innerHTML = `
            <div class="empty-sales">
                Erro ao carregar as vendas.
            </div>
        `;

        return;
    }


    if (!vendasData || vendasData.length === 0) {

        vendas = [];

        renderizarVendas();

        return;
    }


    // =====================================================
    // BUSCAR CLIENTES
    // =====================================================

    const clienteIds =
        [
            ...new Set(
                vendasData
                    .map(venda => venda.cliente_id)
                    .filter(Boolean)
            )
        ];


    let clientes = [];


    if (clienteIds.length > 0) {

        const {
            data,
            error
        } = await supabaseClient

            .from("clientes")

            .select(
                "id, nome, telefone"
            )

            .in(
                "id",
                clienteIds
            );


        if (error) {

            console.error(
                "ERRO AO CARREGAR CLIENTES:",
                error
            );

        } else {

            clientes = data || [];

        }

    }


    // =====================================================
    // BUSCAR ITENS DAS VENDAS
    // =====================================================

    const vendaIds =
        vendasData.map(
            venda => venda.id
        );


    const {
        data: itensData,
        error: itensError
    } = await supabaseClient

        .from("itens_venda")

        .select("*")

        .in(
            "venda_id",
            vendaIds
        );


    if (itensError) {

        console.error(
            "ERRO AO CARREGAR ITENS:",
            itensError
        );

    }


    const itens =
        itensData || [];


    // =====================================================
    // BUSCAR PRODUTOS
    // =====================================================

    const produtoIds =
        [
            ...new Set(
                itens
                    .map(item => item.produto_id)
                    .filter(Boolean)
            )
        ];


    let produtosVenda = [];


    if (produtoIds.length > 0) {

        const {
            data,
            error
        } = await supabaseClient

            .from("produtos")

            .select(`
                id,
                nome,
                imagem_url,
                categoria,
                tamanho,
                cor
            `)

            .in(
                "id",
                produtoIds
            );


        if (error) {

            console.error(
                "ERRO AO CARREGAR PRODUTOS DAS VENDAS:",
                error
            );

        } else {

            produtosVenda =
                data || [];

        }

    }


    // =====================================================
    // MONTAR ESTRUTURA DAS VENDAS
    // =====================================================

    vendas =
        vendasData.map(venda => {

            const cliente =
                clientes.find(
                    cliente =>
                        cliente.id ===
                        venda.cliente_id
                ) || null;


            const itensVenda =
                itens

                    .filter(
                        item =>
                            item.venda_id ===
                            venda.id
                    )

                    .map(item => {

                        const produto =
                            produtosVenda.find(
                                produto =>
                                    produto.id ===
                                    item.produto_id
                            ) || null;


                        return {

                            ...item,

                            produtos:
                                produto

                        };

                    });


            return {

                ...venda,

                clientes:
                    cliente,

                itens_venda:
                    itensVenda

            };

        });


    console.log(
        "Vendas carregadas:",
        vendas
    );


    // =====================================================
    // MOSTRAR NA TELA
    // =====================================================

    renderizarVendas();

}


// =====================================================
// RENDERIZAR VENDAS
// =====================================================

function renderizarVendas() {

    const pesquisa =
        document
            .getElementById("sales-search")
            .value
            .toLowerCase()
            .trim();


    let lista =
        [...vendas];


    if (abaAtual === "pendentes") {

        lista =
            lista.filter(
                venda =>
                    venda.status_pagamento ===
                    "pendente"
            );

    }


    if (pesquisa) {

        lista =
            lista.filter(venda => {

                const nome =
                    venda.clientes?.nome
                    ?.toLowerCase() || "";

                return nome.includes(pesquisa);

            });

    }


    if (lista.length === 0) {

        salesList.innerHTML = `
            <div class="empty-sales">
                Nenhuma venda encontrada.
            </div>
        `;

        return;

    }


    salesList.innerHTML = "";


    lista.forEach(venda => {

        const card =
            document.createElement("div");


        card.className =
            "sale-card";


        const nome =
            venda.clientes?.nome ||
            "Cliente não informado";


        const data =
            new Date(
                venda.criado_em
            ).toLocaleDateString(
                "pt-BR"
            );


        const statusPago =
            venda.status_pagamento ===
            "pago";


        card.innerHTML = `

            <div class="sale-card-top">

                <div>

                    <span class="sale-client">
                        ${nome}
                    </span>

                    <small>
                        ${data}
                    </small>

                </div>


                <strong>
                    R$ ${formatarMoeda(
                        venda.valor_total
                    )}
                </strong>

            </div>


            <div class="sale-card-bottom">

                <span>
                    ${formatarPagamento(
                        venda.forma_pagamento
                    )}
                </span>


                <span class="${
                    statusPago
                        ? "status-paid"
                        : "status-pending"
                }">

                    ${
                        statusPago
                            ? "✓ Pago"
                            : "● Não pago"
                    }

                </span>

            </div>

        `;


        card.addEventListener(
            "click",
            () => abrirDetalhes(venda)
        );


        salesList.appendChild(card);

    });

}


// =====================================================
// DETALHES DA VENDA
// =====================================================

function abrirDetalhes(venda) {

    const nome =
        venda.clientes?.nome ||
        "Cliente não informado";


    const telefone =
        venda.clientes?.telefone ||
        "Não informado";


    const data =
        new Date(
            venda.criado_em
        ).toLocaleString(
            "pt-BR"
        );


    const pago =
        venda.status_pagamento ===
        "pago";


    const detalhes =
        document.getElementById(
            "sale-details"
        );


    let itensHTML = "";


    venda.itens_venda.forEach(item => {

        const produto =
            item.produtos;


        itensHTML += `

            <div class="detail-item">

                <div>

                    <strong>
                        ${produto?.name || "Produto"}
                    </strong>

                    <span>
                        ${item.quantidade} ×
                        R$ ${formatarMoeda(
                            item.preco_unitario
                        )}
                    </span>

                </div>


                <strong>
                    R$ ${formatarMoeda(
                        item.subtotal
                    )}
                </strong>

            </div>

        `;

    });


    detalhes.innerHTML = `

        <span class="section-label">
            DETALHES DA VENDA
        </span>


        <h2>
            ${nome}
        </h2>


        <div class="details-info">

            <p>
                <strong>Telefone:</strong>
                ${telefone}
            </p>

            <p>
                <strong>Data:</strong>
                ${data}
            </p>

        </div>


        <h3>
            Produtos
        </h3>


        <div class="details-items">

            ${itensHTML}

        </div>


        <div class="details-total">

            <span>
                Total
            </span>

            <strong>
                R$ ${formatarMoeda(
                    venda.valor_total
                )}
            </strong>

        </div>


        <div class="details-payment">

            <span>
                ${formatarPagamento(
                    venda.forma_pagamento
                )}
            </span>


            <strong class="${
                pago
                    ? "status-paid"
                    : "status-pending"
            }">

                ${
                    pago
                        ? "✓ PAGO"
                        : "● NÃO PAGO"
                }

            </strong>

        </div>


        ${
            venda.observacao
                ? `
                    <div class="sale-note">
                        <strong>
                            Observação
                        </strong>

                        <p>
                            ${venda.observacao}
                        </p>
                    </div>
                `
                : ""
        }


        ${
            !pago &&
            venda.forma_pagamento === "fiado"
                ? `
                    <button
                        class="primary-button"
                        onclick="marcarComoPago(${venda.id})"
                    >
                        ✓ Marcar como pago
                    </button>
                `
                : ""
        }

    `;


    detailsModal.classList.add(
        "show"
    );

}


// =====================================================
// MARCAR COMO PAGO
// =====================================================

async function marcarComoPago(vendaId) {

    const confirmar =
        confirm(
            "Confirmar que esta venda foi paga?"
        );


    if (!confirmar) return;


    const { error } =
        await supabaseClient.rpc(
            "marcar_venda_paga",
            {
                p_venda_id: vendaId
            }
        );


    if (error) {

        console.error(error);

        alert(
            "Não foi possível atualizar o pagamento."
        );

        return;

    }


    alert(
        "Venda marcada como paga!"
    );


    fecharDetalhes();

    await carregarVendas();

    await atualizarResumo();

}


// =====================================================
// RESUMO
// =====================================================

async function atualizarResumo() {

    const hoje =
        new Date();


    const inicio =
        new Date(
            hoje.getFullYear(),
            hoje.getMonth(),
            hoje.getDate()
        );


    const vendasHoje =
        vendas.filter(venda =>
            new Date(
                venda.criado_em
            ) >= inicio
        );


    const totalHoje =
        vendasHoje.reduce(
            (total, venda) =>
                total +
                Number(venda.valor_total),
            0
        );


    const pendentes =
        vendas.filter(
            venda =>
                venda.status_pagamento ===
                "pendente"
        );


    const totalPendente =
        pendentes.reduce(
            (total, venda) =>
                total +
                Number(venda.valor_total),
            0
        );


    document.getElementById(
        "sales-today"
    ).textContent =
        `R$ ${formatarMoeda(totalHoje)}`;


    document.getElementById(
        "sales-count"
    ).textContent =
        vendas.length;


    document.getElementById(
        "pending-value"
    ).textContent =
        `R$ ${formatarMoeda(totalPendente)}`;

}


// =====================================================
// MODAIS
// =====================================================

function abrirModalVenda() {

    itensVenda = [];

    saleForm.reset();

    renderizarItens();

    saleModal.classList.add(
        "show"
    );

}


function fecharModalVenda() {

    saleModal.classList.remove(
        "show"
    );

}


function fecharDetalhes() {

    detailsModal.classList.remove(
        "show"
    );

}


// =====================================================
// EVENTOS
// =====================================================

function configurarEventos() {

    document
        .getElementById("open-sale-button")
        .addEventListener(
            "click",
            abrirModalVenda
        );


    document
        .getElementById("close-sale-modal")
        .addEventListener(
            "click",
            fecharModalVenda
        );


    document
        .getElementById("close-details-modal")
        .addEventListener(
            "click",
            fecharDetalhes
        );


    document
        .getElementById("add-sale-product")
        .addEventListener(
            "click",
            adicionarProdutoVenda
        );


    saleForm.addEventListener(
        "submit",
        registrarVenda
    );


    document
        .getElementById("logout-button")
        .addEventListener(
            "click",
            sair
        );


    document
        .getElementById("sales-search")
        .addEventListener(
            "input",
            renderizarVendas
        );


    document
        .getElementById("tab-sales")
        .addEventListener(
            "click",
            () => {

                abaAtual = "todas";

                document
                    .getElementById("tab-sales")
                    .classList.add("active");

                document
                    .getElementById("tab-pending")
                    .classList.remove("active");

                renderizarVendas();

            }
        );


    document
        .getElementById("tab-pending")
        .addEventListener(
            "click",
            () => {

                abaAtual = "pendentes";

                document
                    .getElementById("tab-pending")
                    .classList.add("active");

                document
                    .getElementById("tab-sales")
                    .classList.remove("active");

                renderizarVendas();

            }
        );

}


// =====================================================
// FORMATAÇÃO
// =====================================================

function formatarMoeda(valor) {

    return Number(valor).toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


function formatarPagamento(
    pagamento
) {

    const nomes = {

        pix: "Pix",

        dinheiro: "Dinheiro",

        cartao: "Cartão",

        fiado: "Fiado"

    };


    return nomes[pagamento] ||
        pagamento;

}


// =====================================================
// RELATÓRIOS
// =====================================================

const reportModal =
    document.getElementById("report-modal");

const reportStartDate =
    document.getElementById("report-start-date");

const reportEndDate =
    document.getElementById("report-end-date");

const reportStatus =
    document.getElementById("report-status");

const reportCount =
    document.getElementById("report-count");

const reportTotal =
    document.getElementById("report-total");

const reportPending =
    document.getElementById("report-pending");

const reportMessage =
    document.getElementById("report-message");


// =====================================================
// ABRIR RELATÓRIO
// =====================================================

function abrirModalRelatorio() {

    const hoje =
        new Date();


    const ano =
        hoje.getFullYear();


    const mes =
        String(
            hoje.getMonth() + 1
        ).padStart(2, "0");


    const dia =
        String(
            hoje.getDate()
        ).padStart(2, "0");


    const hojeFormatado =
        `${ano}-${mes}-${dia}`;


    // Se estiver vazio, coloca o mês atual

    if (!reportStartDate.value) {

        reportStartDate.value =
            `${ano}-${mes}-01`;

    }


    if (!reportEndDate.value) {

        reportEndDate.value =
            hojeFormatado;

    }


    atualizarPreviewRelatorio();


    reportModal.classList.add(
        "show"
    );

}


// =====================================================
// FECHAR RELATÓRIO
// =====================================================

function fecharModalRelatorio() {

    reportModal.classList.remove(
        "show"
    );

}


// =====================================================
// FILTRAR VENDAS
// =====================================================

function obterVendasRelatorio() {

    const inicio =
        reportStartDate.value
            ? new Date(
                `${reportStartDate.value}T00:00:00`
            )
            : null;


    const fim =
        reportEndDate.value
            ? new Date(
                `${reportEndDate.value}T23:59:59`
            )
            : null;


    const status =
        reportStatus.value;


    return vendas.filter(venda => {

        const dataVenda =
            new Date(
                venda.criado_em
            );


        // ---------------------------------------------
        // DATA
        // ---------------------------------------------

        if (
            inicio &&
            dataVenda < inicio
        ) {

            return false;

        }


        if (
            fim &&
            dataVenda > fim
        ) {

            return false;

        }


        // ---------------------------------------------
        // STATUS
        // ---------------------------------------------

        if (
            status === "pagas" &&
            venda.status_pagamento !== "pago"
        ) {

            return false;

        }


        if (
            status === "pendentes" &&
            venda.status_pagamento !== "pendente"
        ) {

            return false;

        }


        return true;

    });

}


// =====================================================
// ATUALIZAR PREVIEW
// =====================================================

function atualizarPreviewRelatorio() {

    const lista =
        obterVendasRelatorio();


    const total =
        lista.reduce(
            (soma, venda) =>
                soma +
                Number(
                    venda.valor_total || 0
                ),
            0
        );


    const pendente =
        lista.reduce(
            (soma, venda) => {

                if (
                    venda.status_pagamento ===
                    "pendente"
                ) {

                    return soma +
                        Number(
                            venda.valor_total || 0
                        );

                }


                return soma;

            },
            0
        );


    reportCount.textContent =
        lista.length;


    reportTotal.textContent =
        `R$ ${formatarMoeda(total)}`;


    reportPending.textContent =
        `R$ ${formatarMoeda(pendente)}`;

}


// =====================================================
// GERAR DADOS DO RELATÓRIO
// =====================================================

function prepararDadosRelatorio() {

    const lista =
        obterVendasRelatorio();


    return lista.map(venda => {

        const produtos =
            (venda.itens_venda || [])
                .map(item => {

                    const nome =
                        item.produtos?.nome ||
                        "Produto";


                    return `${item.quantidade}x ${nome}`;

                })
                .join(", ");


        const cliente =
            venda.clientes?.nome ||
            "Não informado";


        const pagamento =
            formatarPagamento(
                venda.forma_pagamento
            );


        const status =
            venda.status_pagamento === "pago"
                ? "Pago"
                : "Não pago";


        const data =
            new Date(
                venda.criado_em
            ).toLocaleDateString(
                "pt-BR"
            );


        return {

            data,

            cliente,

            produtos,

            pagamento,

            status,

            valor:
                Number(
                    venda.valor_total || 0
                )

        };

    });

}


// =====================================================
// EXPORTAR EXCEL
// =====================================================

function exportarExcel() {

    const dados =
        prepararDadosRelatorio();


    if (dados.length === 0) {

        alert(
            "Nenhuma venda encontrada para o período selecionado."
        );

        return;

    }


    const total =
        dados.reduce(
            (soma, venda) =>
                soma + venda.valor,
            0
        );


    const pendente =
        dados.reduce(
            (soma, venda) => {

                if (
                    venda.status ===
                    "Não pago"
                ) {

                    return soma +
                        venda.valor;

                }


                return soma;

            },
            0
        );


    // ---------------------------------------------
    // RESUMO
    // ---------------------------------------------

    const resumo = [

        ["MARY BOUTIQUE"],

        ["RELATÓRIO DE VENDAS"],

        [],

        [
            "Período inicial",
            reportStartDate.value || "Todos"
        ],

        [
            "Período final",
            reportEndDate.value || "Todos"
        ],

        [],

        [
            "Quantidade de vendas",
            dados.length
        ],

        [
            "Total vendido",
            total
        ],

        [
            "Fiado em aberto",
            pendente
        ],

        [],

        [
            "Data",
            "Cliente",
            "Produtos",
            "Pagamento",
            "Status",
            "Valor"
        ]

    ];


    // ---------------------------------------------
    // VENDAS
    // ---------------------------------------------

    dados.forEach(venda => {

        resumo.push([

            venda.data,

            venda.cliente,

            venda.produtos,

            venda.pagamento,

            venda.status,

            venda.valor

        ]);

    });


    // ---------------------------------------------
    // CRIAR PLANILHA
    // ---------------------------------------------

    const worksheet =
        XLSX.utils.aoa_to_sheet(
            resumo
        );


    worksheet["!cols"] = [

        { wch: 14 },

        { wch: 25 },

        { wch: 45 },

        { wch: 15 },

        { wch: 15 },

        { wch: 15 }

    ];


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Vendas"
    );


    // ---------------------------------------------
    // NOME DO ARQUIVO
    // ---------------------------------------------

    const inicio =
        reportStartDate.value ||
        "inicio";


    const fim =
        reportEndDate.value ||
        "fim";


    XLSX.writeFile(
        workbook,
        `Mary-Boutique-Vendas-${inicio}-ate-${fim}.xlsx`
    );

}


// =====================================================
// EXPORTAR PDF
// =====================================================

function exportarPDF() {

    const dados =
        prepararDadosRelatorio();


    if (dados.length === 0) {

        alert(
            "Nenhuma venda encontrada para o período selecionado."
        );

        return;

    }


    const {
        jsPDF
    } = window.jspdf;


    const doc =
        new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });


    // ---------------------------------------------
    // CABEÇALHO
    // ---------------------------------------------

    doc.setFontSize(20);

    doc.setFont(
        "helvetica",
        "bold"
    );


    doc.text(
        "MARY BOUTIQUE",
        14,
        18
    );


    doc.setFontSize(13);

    doc.setFont(
        "helvetica",
        "normal"
    );


    doc.text(
        "Relatório de Vendas",
        14,
        27
    );


    // ---------------------------------------------
    // PERÍODO
    // ---------------------------------------------

    doc.setFontSize(9);


    doc.text(
        `Período: ${
            reportStartDate.value ||
            "Todos"
        } até ${
            reportEndDate.value ||
            "Todos"
        }`,
        14,
        35
    );


    // ---------------------------------------------
    // RESUMO
    // ---------------------------------------------

    const total =
        dados.reduce(
            (soma, venda) =>
                soma + venda.valor,
            0
        );


    const recebido =
        dados.reduce(
            (soma, venda) => {

                if (
                    venda.status ===
                    "Pago"
                ) {

                    return soma +
                        venda.valor;

                }


                return soma;

            },
            0
        );


    const pendente =
        dados.reduce(
            (soma, venda) => {

                if (
                    venda.status ===
                    "Não pago"
                ) {

                    return soma +
                        venda.valor;

                }


                return soma;

            },
            0
        );


    doc.setFontSize(10);

    doc.text(
        `Vendas: ${dados.length}`,
        14,
        45
    );


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
        `Fiado em aberto: R$ ${formatarMoeda(pendente)}`,
        215,
        45
    );


    // ---------------------------------------------
    // TABELA
    // ---------------------------------------------

    const tabela =
        dados.map(venda => [

            venda.data,

            venda.cliente,

            venda.produtos,

            venda.pagamento,

            venda.status,

            `R$ ${formatarMoeda(
                venda.valor
            )}`

        ]);


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

            0: {
                cellWidth: 25
            },

            1: {
                cellWidth: 40
            },

            2: {
                cellWidth: 90
            },

            3: {
                cellWidth: 30
            },

            4: {
                cellWidth: 30
            },

            5: {
                cellWidth: 30
            }

        }

    });


    // ---------------------------------------------
    // RODAPÉ
    // ---------------------------------------------

    const pagina =
        doc.internal.getNumberOfPages();


    doc.setPage(
        pagina
    );


    doc.setFontSize(8);


    doc.text(
        "Mary Boutique - Relatório gerado pelo sistema",
        14,
        200
    );


    // ---------------------------------------------
    // SALVAR
    // ---------------------------------------------

    const inicio =
        reportStartDate.value ||
        "inicio";


    const fim =
        reportEndDate.value ||
        "fim";


    doc.save(
        `Mary-Boutique-Vendas-${inicio}-ate-${fim}.pdf`
    );

}


// =====================================================
// EVENTOS DOS RELATÓRIOS
// =====================================================

document
    .getElementById("open-report-button")
    .addEventListener(
        "click",
        abrirModalRelatorio
    );


document
    .getElementById("close-report-modal")
    .addEventListener(
        "click",
        fecharModalRelatorio
    );


reportModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            reportModal
        ) {

            fecharModalRelatorio();

        }

    }
);


reportStartDate.addEventListener(
    "change",
    atualizarPreviewRelatorio
);


reportEndDate.addEventListener(
    "change",
    atualizarPreviewRelatorio
);


reportStatus.addEventListener(
    "change",
    atualizarPreviewRelatorio
);


document
    .getElementById("export-excel-button")
    .addEventListener(
        "click",
        exportarExcel
    );


document
    .getElementById("export-pdf-button")
    .addEventListener(
        "click",
        exportarPDF
    );
