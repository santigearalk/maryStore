const loginForm = document.getElementById("login-form");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");


loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    loginButton.disabled = true;
    loginButton.textContent = "Entrando...";

    loginMessage.textContent = "";
    loginMessage.className = "message";


    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });


    if (error) {

        loginMessage.textContent = "E-mail ou senha incorretos.";
        loginMessage.classList.add("error");

        loginButton.disabled = false;
        loginButton.textContent = "Entrar";

        return;
    }


    window.location.href = "estoque.html";

});