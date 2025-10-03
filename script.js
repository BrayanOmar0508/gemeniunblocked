const container = document.querySelector(".container");
const ChatContainer = document.querySelector(".chat-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const FileInput = promptForm.querySelector("#file-input");
const FileUpload = promptForm.querySelector(".file-upload");
const themes = document.querySelector("#themes-toggle");
const API_KEY = "AIzaSyDN2JfVM3itzybXPZ2BoqoFb3DANMKtLeY"
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`

let userData = { message: "", file: {} };
const ChatHistory = [];
let typingInterval, controller;

window.addEventListener("load", () => {
  const loadingScreen = document.getElementById("loading-screen");
  const loadingText = document.getElementById("loading-text");
  const progressCircle = document.getElementById("progress-circle");
  const chatbotContainer = document.querySelector(".container");

  let progress = 0;
  const circumference = 2 * Math.PI * 50; // 2πr with r=50

  const interval = setInterval(() => {
    progress += 1;
    loadingText.textContent = `${progress}%`;
    const offset = circumference - (progress / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        loadingScreen.style.display = "none";
        chatbotContainer.style.display = "block";
      }, 300);
    }
  }, 30); // 100 * 30ms = 3 seconds
});


/* ---------------- SAVE / LOAD ---------------- */
const saveChatHistory = () => {
    localStorage.setItem("saved-api-chats", JSON.stringify(ChatHistory));
};

const loadSavedChatHistory = () => {
    const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
    const isLightTheme = localStorage.getItem("theme") === "light_mode";

    // Apply theme
    document.body.classList.toggle("light-theme", isLightTheme);
    themes.textContent = isLightTheme ? "dark_mode" : "light_mode";

    ChatContainer.innerHTML = "";
    ChatHistory.length = 0;

    savedConversations.forEach(conversation => {
        if (conversation.role === "user") {
            const userMsgHTML = `<p class="message-text">${conversation.parts[0].text}</p>`;
            ChatContainer.appendChild(createMsgElement(userMsgHTML, "user-message"));
        } else if (conversation.role === "model") {
            const botMsgHTML = `
                <img src="./1728457808_gemini_Icon_png.png" alt="avatar" class="avatar">
                <p class="message-text">${conversation.parts[0].text}</p>
            `;
            ChatContainer.appendChild(createMsgElement(botMsgHTML, "bot-message"));
        }
        ChatHistory.push(conversation);
    });

    if (savedConversations.length > 0) {
        document.body.classList.add("chat-activite");
        scrollBottom();
    }
};

/* ---------------- HELPERS ---------------- */
const createMsgElement = (content, ...classess) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classess);
    div.innerHTML = content;
    return div;
};
const scrollBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

const typingEffect = (Text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const word = Text.split(" ");
    let wordIndex = 0;

    typingInterval = setInterval(() => {
        if (wordIndex < word.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + word[wordIndex++];
            botMsgDiv.classList.remove("loading");
            scrollBottom();
        } else {
            clearInterval(typingInterval);
            document.body.classList.remove("bot-responded");
            botMsgDiv.classList.remove("loading");
        }
    }, 40);
};

/* ---------------- BOT RESPONSE ---------------- */
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: ChatHistory }),
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        textElement.textContent = responseText;
        typingEffect(responseText, textElement, botMsgDiv);

        ChatHistory.push({ role: "model", parts: [{ text: responseText }] });
        saveChatHistory();

    } catch (error) {
        textElement.style.color = "#d62939";
        textElement.textContent = error.name === "AbortError" ? "Response generation stopped" : error.message;
        document.body.classList.remove("bot-responded");
        botMsgDiv.classList.remove("loading");
    } finally {
        userData.file = {};
    }
};

/* ---------------- FORM SUBMIT ---------------- */
const handdleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responded")) return;

    promptInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responded", "chat-activite");
    FileUpload.classList.remove("active", "img-attached", "file-attached");

    const userMsgHTML = `<p class="message-text"></p> ${
        userData.file.data 
            ? (userData.file.isImage 
                ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment"/>` 
                : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) 
            : ""}`;
    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    ChatContainer.appendChild(userMsgDiv);

    ChatHistory.push({ role: "user", parts: [{ text: userMessage }] });
    saveChatHistory();
    scrollBottom();

    setTimeout(() => {
        const botMsgHTML = `<img src="./1728457808_gemini_Icon_png.png" alt="avatar" class="avatar"><p class="message-text">Just a sec.....</p>`;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        ChatContainer.appendChild(botMsgDiv);
        scrollBottom();
        generateResponse(botMsgDiv);
    }, 600);
};

/* ---------------- FILE HANDLERS ---------------- */
FileInput.addEventListener("change", () => {
    const file = FileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        FileInput.value = '';
        const base64String = e.target.result.split(",")[1];
        FileUpload.querySelector(".file-preview").src = e.target.result;
        FileUpload.classList.add("active", isImage ? "img-attached" : "file-attached");

        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
    };
});

/* ---------------- BUTTONS ---------------- */
document.querySelector("#stop-response").addEventListener("click", () => {
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);
    document.body.classList.remove("bot-responded");
    ChatContainer.querySelector(".bot-message.loading")?.classList.remove("loading");
});
document.querySelector("#cancel-file").addEventListener("click", () => {
    userData.file = {};
    FileUpload.classList.remove("active", "img-attached", "file-attached");
});
document.querySelector("#delete-btn").addEventListener("click", () => {
    ChatHistory.length = 0;
    ChatContainer.innerHTML = "";
    localStorage.removeItem("saved-api-chats");
    document.body.classList.remove("bot-responded", "chat-activite");
});

/* ---------------- MISC ---------------- */
document.querySelectorAll(".card-item").forEach(item=>{
    item.addEventListener("click",()=>{
        promptInput.value = item.querySelector("text").textContent;
        promptInput.dispatchEvent(new Event("submit"));
    });
});
promptForm.addEventListener("submit", handdleFormSubmit);
promptForm.querySelector("#add-file").addEventListener("click", () => FileInput.click());

document.addEventListener("click",({target})=>{
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || 
        (wrapper.classList.contains("hide-controls") && (target.id == "add-file" || target.id === "stop-response"));
    wrapper.classList.toggle("hide-controls", shouldHide);
});

themes.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("theme", isLightTheme ? "light_mode" : "dark_mode");
    themes.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// Load theme + saved chats on page load
const isLightTheme = localStorage.getItem("theme") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themes.textContent = isLightTheme ? "dark_mode" : "light_mode";
loadSavedChatHistory();
