# Web Scraping with Vision GPT and Puppeteer. 

Following ByteGrad's tutorial on this topic [found here](https://www.youtube.com/watch?v=fjP328HN-eY&t=302s) while also taking some of my own liberties to make it my own. 


### 4/3/2024 Changelog 
To start, in the tutorial he uses a basic site that he spun up with presumably little html to be scraped off of it. Since I'm using Kayak.com to scrape hotel information, there is more html being returned (as I've yet to target site specific elements) resulting in a higher than allowed token amount to send to OpenAI's chat model. This is handled by batching the requests. Ultimately this is probably pointless since the next iteration of this app will be utilizing OpenAI's Vision API, however, it is good practice. 