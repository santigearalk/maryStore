let products = [];

let selectedImage = null;

let editingProduct = null;


// =====================================================
// ELEMENTOS
// =====================================================

const productsGrid =
    document.getElementById("products-grid");

const emptyMessage =
    document.getElementById("empty-message");

const searchInput =
    document.getElementById("search-input");

const modal =
    document.getElementById("product-modal");

const openModalButton =
    document.getElementById("open-modal-button");

const closeModalButton =
    document.getElementById("close-modal-button");

const productForm =
    document.getElementById("product-form");

const productId =
    document.getElementById("product-id");

const productName =
    document.getElementById("product-name");

const productCategory =
    document.getElementById("product-category");

const productSize =
    document.getElementById("product-size");

const productColor =
    document.getElementById("product-color");

const productQuantity =
    document.getElementById("product-quantity");

const productPrice =
    document.getElementById("product-price");

const imageInput =
    document.getElementById("image-input");

const imagePreview =
    document.getElementById("image-preview");

const saveProductButton =
    document.getElementById("save-product-button");

const logoutButton =
    document.getElementById("logout-button");

const totalProducts =
    document.getElementById("total-products");

const totalStock =
    document.getElementById("total-stock");

const totalValue =
    document.getElementById("total-value");


// =====================================================
// TÍTULO DO MODAL
// =====================================================

const modalTitle =
    modal?.querySelector("h2");


// =====================================================
// VERIFICAR LOGIN
// =====================================================

async function checkUser() {

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();


    if (!session) {

        window.location.href = "index.html";

        return false;
    }


    return true;
}


// =====================================================
// CARREGAR PRODUTOS
// =====================================================

async function loadProducts() {

    const { data, error } =
        await supabaseClient

            .from("produtos")

            .select("*")

            .order(
                "criado_em",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(error);

        productsGrid.innerHTML = `
            <p class="error-text">
                Erro ao carregar produtos.
            </p>
        `;

        return;
    }


    products = data || [];


    renderProducts();

    updateSummary();
}


// =====================================================
// MOSTRAR PRODUTOS
// =====================================================

function renderProducts() {

    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    const filteredProducts =
        products.filter(product => {

            return (

                product.nome
                    ?.toLowerCase()
                    .includes(search)

                ||

                product.categoria
                    ?.toLowerCase()
                    .includes(search)

                ||

                product.tamanho
                    ?.toLowerCase()
                    .includes(search)

                ||

                product.cor
                    ?.toLowerCase()
                    .includes(search)

            );

        });


    productsGrid.innerHTML = "";


    if (filteredProducts.length === 0) {

        emptyMessage.style.display = "block";

        return;
    }


    emptyMessage.style.display = "none";


    filteredProducts.forEach(product => {

        const card =
            document.createElement("div");

        card.className =
            "product-card";


        const image =
            product.imagem_url

                ? `
                    <img
                        src="${product.imagem_url}"
                        alt="${escapeHTML(product.nome)}"
                    >
                `

                : `
                    <div class="no-image">
                        📷
                    </div>
                `;


        const price =
            product.preco

                ? Number(product.preco)
                    .toLocaleString(
                        "pt-BR",
                        {
                            style: "currency",
                            currency: "BRL"
                        }
                    )

                : "R$ 0,00";


        card.innerHTML = `

            <div class="product-image">

                ${image}

            </div>


            <div class="product-info">


                <h3>
                    ${escapeHTML(product.nome)}
                </h3>


                <p class="product-category">

                    ${escapeHTML(
                        product.categoria ||
                        "Sem categoria"
                    )}

                </p>


                <div class="product-details">

                    ${
                        product.tamanho

                            ? `
                                <span>
                                    ${escapeHTML(
                                        product.tamanho
                                    )}
                                </span>
                            `

                            : ""
                    }


                    ${
                        product.cor

                            ? `
                                <span>
                                    ${escapeHTML(
                                        product.cor
                                    )}
                                </span>
                            `

                            : ""
                    }

                </div>


                <div class="product-bottom">

                    <div>

                        <span class="stock-label">
                            Estoque
                        </span>

                        <strong
                            class="${
                                product.quantidade <= 3
                                    ? "low-stock"
                                    : ""
                            }"
                        >
                            ${product.quantidade}
                        </strong>

                    </div>


                    <strong class="product-price">

                        ${price}

                    </strong>

                </div>


                <div class="product-actions">


                    <button
                        class="btn-edit"
                        onclick="editProduct(${product.id})"
                    >
                        Editar
                    </button>


                    <button
                        class="btn-delete"
                        onclick="deleteProduct(${product.id})"
                    >
                        Excluir
                    </button>


                </div>


            </div>

        `;


        productsGrid.appendChild(card);

    });

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escapeHTML(text) {

    if (!text) return "";


    return String(text)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");
}


// =====================================================
// ATUALIZAR RESUMO
// =====================================================

function updateSummary() {

    const quantity =
        products.reduce(

            (total, product) =>

                total +
                Number(
                    product.quantidade || 0
                ),

            0

        );


    const value =
        products.reduce(

            (total, product) =>

                total +

                Number(
                    product.quantidade || 0
                ) *

                Number(
                    product.preco || 0
                ),

            0

        );


    totalProducts.textContent =
        products.length;


    totalStock.textContent =
        quantity;


    totalValue.textContent =
        value.toLocaleString(

            "pt-BR",

            {
                style: "currency",
                currency: "BRL"
            }

        );

}


// =====================================================
// ABRIR MODAL
// =====================================================

function openModal() {

    modal.classList.add("show");

}


// =====================================================
// FECHAR MODAL
// =====================================================

function closeModal() {

    modal.classList.remove("show");


    productForm.reset();


    productId.value = "";


    editingProduct = null;


    selectedImage = null;


    if (modalTitle) {

        modalTitle.textContent =
            "Adicionar produto";

    }


    saveProductButton.textContent =
        "Salvar produto";


    imagePreview.innerHTML = `

        <span>📷</span>

        <p>Nenhuma imagem</p>

    `;

}


// =====================================================
// NOVO PRODUTO
// =====================================================

openModalButton.addEventListener(
    "click",
    function () {

        closeModal();

        openModal();

    }
);


// =====================================================
// FECHAR MODAL
// =====================================================

closeModalButton.addEventListener(
    "click",
    closeModal
);


// =====================================================
// CLICAR FORA DO MODAL
// =====================================================

modal.addEventListener(
    "click",
    function (event) {

        if (event.target === modal) {

            closeModal();

        }

    }
);


// =====================================================
// PREVISUALIZAR IMAGEM
// =====================================================

imageInput.addEventListener(
    "change",
    function () {

        const file =
            imageInput.files[0];


        if (!file) return;


        selectedImage = file;


        const reader =
            new FileReader();


        reader.onload =
            function (event) {

                imagePreview.innerHTML = `

                    <img
                        src="${event.target.result}"
                        alt="Prévia"
                    >

                `;

            };


        reader.readAsDataURL(file);

    }
);


// =====================================================
// ADICIONAR / EDITAR
// =====================================================

productForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const wasEditing =
            Boolean(editingProduct);


        saveProductButton.disabled =
            true;


        saveProductButton.textContent =
            "Salvando...";


        try {

            const name =
                productName.value.trim();


            const category =
                productCategory.value.trim();


            const size =
                productSize.value.trim();


            const color =
                productColor.value.trim();


            const quantity =
                Number(
                    productQuantity.value
                );


            const price =
                Number(
                    productPrice.value || 0
                );


            let imageUrl =
                editingProduct?.imagem_url ||
                null;


            // =========================================
            // UPLOAD DA IMAGEM
            // =========================================

            if (selectedImage) {

                const fileExtension =
                    selectedImage.name
                        .split(".")
                        .pop();


                const fileName =
                    `${crypto.randomUUID()}.${fileExtension}`;


                const filePath =
                    `produtos/${fileName}`;


                const {
                    error: uploadError
                } =
                    await supabaseClient

                        .storage

                        .from("produtos")

                        .upload(

                            filePath,

                            selectedImage,

                            {
                                upsert: false
                            }

                        );


                if (uploadError) {

                    console.error(
                        uploadError
                    );

                    throw new Error(
                        "Não foi possível enviar a imagem."
                    );

                }


                const {
                    data: publicUrlData
                } =
                    supabaseClient

                        .storage

                        .from("produtos")

                        .getPublicUrl(
                            filePath
                        );


                imageUrl =
                    publicUrlData.publicUrl;

            }


            // =========================================
            // DADOS DO PRODUTO
            // =========================================

            const productData = {

                nome: name,

                categoria: category,

                tamanho: size,

                cor: color,

                quantidade: quantity,

                preco: price,

                imagem_url: imageUrl

            };


            // =========================================
            // EDITAR
            // =========================================

            if (editingProduct) {

                const {
                    error
                } =
                    await supabaseClient

                        .from("produtos")

                        .update(productData)

                        .eq(
                            "id",
                            editingProduct.id
                        );


                if (error) {

                    throw error;

                }

            }


            // =========================================
            // ADICIONAR
            // =========================================

            else {

                const {
                    error
                } =
                    await supabaseClient

                        .from("produtos")

                        .insert(
                            productData
                        );


                if (error) {

                    throw error;

                }

            }


            closeModal();


            await loadProducts();

        }


        catch (error) {

            console.error(error);


            alert(

                error.message ||

                "Erro ao salvar produto."

            );

        }


        finally {

            saveProductButton.disabled =
                false;


            saveProductButton.textContent =
                wasEditing

                    ? "Salvar alterações"

                    : "Salvar produto";

        }

    }
);


// =====================================================
// EDITAR PRODUTO
// =====================================================

window.editProduct =
    function (id) {

        const product =
            products.find(

                product =>
                    product.id === id

            );


        if (!product) return;


        editingProduct =
            product;


        productId.value =
            product.id;


        productName.value =
            product.nome || "";


        productCategory.value =
            product.categoria || "";


        productSize.value =
            product.tamanho || "";


        productColor.value =
            product.cor || "";


        productQuantity.value =
            product.quantidade || 0;


        productPrice.value =
            product.preco || 0;


        if (modalTitle) {

            modalTitle.textContent =
                "Editar produto";

        }


        saveProductButton.textContent =
            "Salvar alterações";


        selectedImage = null;


        if (product.imagem_url) {

            imagePreview.innerHTML = `

                <img
                    src="${product.imagem_url}"
                    alt="${escapeHTML(product.nome)}"
                >

            `;

        }


        else {

            imagePreview.innerHTML = `

                <span>📷</span>

                <p>Nenhuma imagem</p>

            `;

        }


        openModal();

    };


// =====================================================
// EXCLUIR PRODUTO
// =====================================================

window.deleteProduct =
    async function (id) {

        const product =
            products.find(

                product =>
                    product.id === id

            );


        if (!product) return;


        const confirmed =
            confirm(

                `Deseja realmente excluir "${product.nome}"?`

            );


        if (!confirmed) return;


        try {

            const {
                error
            } =
                await supabaseClient

                    .from("produtos")

                    .delete()

                    .eq("id", id);


            if (error) {

                throw error;

            }


            await loadProducts();

        }


        catch (error) {

            console.error(error);


            alert(
                "Não foi possível excluir o produto."
            );

        }

    };


// =====================================================
// PESQUISA
// =====================================================

searchInput.addEventListener(
    "input",
    renderProducts
);


// =====================================================
// LOGOUT
// =====================================================

logoutButton.addEventListener(
    "click",
    async function () {

        await supabaseClient.auth.signOut();


        window.location.href =
            "index.html";

    }
);


// =====================================================
// INICIALIZAR
// =====================================================

async function initialize() {

    const loggedIn =
        await checkUser();


    if (!loggedIn) return;


    await loadProducts();

}


initialize();
