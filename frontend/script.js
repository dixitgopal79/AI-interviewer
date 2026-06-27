let currentQuestion = 1;
let totalQuestions = 5;

async function startInterview() {

    document.getElementById("feedback").innerHTML = "Loading AI Question...";

    try {

        const response = await fetch("http://127.0.0.1:8000/question");

        const data = await response.json();

        document.getElementById("question").innerText = data.question;

        document.getElementById("questionNo").innerText =
            `Question ${currentQuestion} / ${totalQuestions}`;

        document.getElementById("progressBar").style.width =
            (currentQuestion / totalQuestions) * 100 + "%";

        document.getElementById("feedback").innerHTML = "";

    }

    catch (error) {

        console.log(error);

        document.getElementById("feedback").innerHTML =
            "❌ Backend Connection Error";

    }

}

async function submitAnswer() {

    let answer = document.getElementById("answer").value.trim();

    if (answer == "") {

        alert("Please write your answer.");

        return;

    }

    document.getElementById("feedback").innerHTML =
        "✅ Answer Submitted";

    document.getElementById("answer").value = "";

    if (currentQuestion < totalQuestions) {

        currentQuestion++;

        setTimeout(() => {

            startInterview();

        },1000);

    }

    else {

        document.getElementById("question").innerHTML =
        "🎉 Interview Completed";

        document.getElementById("questionNo").innerHTML =
        "Completed";

        document.getElementById("feedback").innerHTML =
        "⭐ AI Interview Finished";

        document.getElementById("progressBar").style.width = "100%";

    }

}