import OpenAI from "openai";
import "dotenv/config";
import puppeteer from "puppeteer-core";
import fs from "fs";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
const BD_AUTH=process.env.BD_AUTH;

const TARGET_URL="https://www.google.com/travel/search?q=calgary&ts=CAEaHBIaEhQKBwjoDxAEGBESBwjoDxAEGBIYATICEAAqBwoFOgNVU0Q&ved=0CAAQ5JsGahcKEwjYvIKxjKmFAxUAAAAAHQAAAAAQew&ictx=3&qs=CAAgACgA&ap=MAA"
async function scrape_html() {
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

async function scrape_screenshots(){
    const browser = await puppeteer.connect({
        browserWSEndpoint: `wss://${BD_AUTH}@brd.superproxy.io:9222`
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    //Targeting URL and the specific content 
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    const currentDatetime = new Date().toISOString().replace(/[-:.]/g, "");
    const screenshotPath = `screenshots/screenshot_${currentDatetime}.jpg`;
    //Taking a screenshot 
    const img64 = await page.screenshot({ path: screenshotPath, fullPage: true, encoding: "base64" });
    return img64;
}

async function call_openai_html(html, model="gpt-3.5-turbo") {
    let response = await openai.chat.completions.create({
        model: model,
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

async function call_openai_vision(encoding, model="gpt-4-vision-preview") {
    const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Give me the hotel name, nightly rate, and the rating of each item in JSON Format. Don't include formatting or new lines." },
              {
                type: "image_url",
                image_url: {
                  "url": 'data:image/jpeg;base64,'+encoding,
                },
              },
            ],
          },
        ],
      });
    const currentDatetime = new Date().toISOString().replace(/[-:.]/g, "");
    console.log(response.choices[0]);
    fs.writeFile(`responses/${currentDatetime}.txt`, response.choices[0], (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Response added to chatGPTResponse.txt");
        }
    });
    return response.choices[0].message.content;

}


async function batch_html_requests(){    
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

async function main() {
    const img64=await scrape_screenshots();
    await call_openai_vision(img64);
}

main().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });