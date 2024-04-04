import OpenAI from "openai";
import "dotenv/config";
import puppeteer from "puppeteer-core";
import fs from "fs";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
const BD_AUTH=process.env.BD_AUTH;

const TARGET_URL="https://www.kayak.com/hotels/Calgary,Alberta,Canada-p62667/2024-04-04/2024-04-05/2adults?sort=rank_a"
async function scraper() {
    //Setting up the browser
    const browser = await puppeteer.connect({
        browserWSEndpoint: `wss://${BD_AUTH}@brd.superproxy.io:9222`
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    //Targeting URL and the specific content 
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    //let html = await page.content();
    let body = await page.evaluate(() => document.body.innerHTML);
    //Saving the HTML to a file
    fs.writeFile("output.html", body, (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log("HTML saved to output.html");
        }
    });
    await page.close();
}

async function call_openai(html) {
    let response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "You accept HTML from travel websites You will return the title, nightly, rate, and the rating of each item in JSON Format."
            },
            {
                role: "user",
                content: `${html}`
            }
        ]
    });
    fs.appendFile("chatGPTResponse.txt", response.choices[0].message.content, (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Response added to chatGPTResponse.txt");
        }
    });
    return response.choices[0].message.content;

}

async function main(){    
    const html = fs.readFileSync("output.html", "utf8");
    const tokens = html.split(' '); // assuming space as a token separator
    const batches = [];
    let currentBatch = '';

    // Create batches of tokens
    for (let i = 0; i < tokens.length; i++) {
        if ((currentBatch + tokens[i]).length > 16385) {
            batches.push(currentBatch);
            currentBatch = tokens[i];
        } else {
            currentBatch += ' ' + tokens[i];
        }
    }
    batches.push(currentBatch); // push the last batch

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
        const result = await call_openai(batches[i]);
        console.log(result);
    }
}

main().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });