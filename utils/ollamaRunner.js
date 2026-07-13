import fs from "fs";
import ollama from "ollama";

export async function llava() {
  // Bild laden und in Base64 umwandeln
  const imageBase64 = fs.readFileSync("./image.png").toString("base64");

  const response = await ollama.chat({
    model: "llava", // Vision-Modell
    messages: [{
      role: "user",
      content: "Was steht auf diesem Flyer? Gib mir jedes Wort.",
      images: [imageBase64] // hier kommt der Base64-String rein
    }]
  });

  console.log(response);
}

export async function llama32() {
  // Bild laden und in Base64 umwandeln
  const imageBase64 = fs.readFileSync("./image.png").toString("base64");

  const response = await ollama.chat({
    model: "llama3.2:latest", // Vision-Modell
    messages: [{
      role: "user",
      content: "Ich habe dich mit dem Internet verbunden.Hier ist eine Lite mit Veranstaltungsorten in Frankfurt. Bitte gib mir eine Liste was heute dort stattfindet.\nBatschkapp\nNachtleben\nZoom\nHafen2\nHfg Kapelle\nKlapperfeld\nSchon schön\nSchlachthof\nMousonturm\nStadthalle Offenbach\nDreikönigskeller\nCave\nElder club\nYachtclub\nIn der Au",
    }]
  });

  console.log(response);
}