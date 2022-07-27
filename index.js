const express = require("express");
const amazonPaapi = require("amazon-paapi");
const dotenv = require("dotenv").config();
const PORT = 3000;
const axios = require("axios").default;
const app = express();
const router = express.Router();

app.use(express.json()); // parse request body as JSON




app.post('/forum-post', async (req, res) => {
    // get asin from body
    let asinData = req.body.asin;

    const commonParameters = {
        AccessKey: process.env.PAAPI_ACCESS_KEY,
        SecretKey: process.env.PAAPI_SECRET_KEY,
        PartnerTag: process.env.PAAPI_PARTNER_TAG,
        PartnerType: "Associates",
        Marketplace: process.env.PAAPI_MARKETPLACE,
    };

    const requestParameters = {
        ItemIds: asinData,
        ItemIdType: 'ASIN',
        Condition: 'New',
        Resources: [
            'ItemInfo.Title',
            'ItemInfo.Classifications',
            'ItemInfo.ByLineInfo',
        ],
      };
    let arr = [];
    amazonApi(commonParameters, requestParameters, arr)
    .then(() => {
        return res.send(arr);
    })
    .catch((error) => {
        throw error;
    });
})

/**
 * 
 * @param {*} commonParameters 
 * @param {*} requestParameters 
 * @param {*} arr 
 */
const amazonApi = async (commonParameters, requestParameters, arr) => {
    await amazonPaapi
    .GetItems(commonParameters, requestParameters)
    .then(async (data) => {
        const output = data.ItemsResult.Items;
        const URL = process.env.PERSPECTIVE_URL;
        let dataOut = {};
        for (let i = 0; i < output.length; i++) {
            const element = output[i];

            // calling perspective
            const title = element.ItemInfo.Title.DisplayValue;
            const brand = element.ItemInfo.ByLineInfo.Brand.DisplayValue;
            const categories = element.ItemInfo.Classifications.Binding.DisplayValue;
            dataOut = {
                "title_only": true,
                "page_metadata": {
                    "productTitle": title,
                    "brand": brand,  
                    "categories": [categories]
                }
            }
            
            // calling perspective function
            const out = await perspectiveApi(URL, dataOut);
            arr.push(out);
        }
    })
    .catch((error) => {
      throw error;
    });
}

/**
 * 
 * @param {*} URL 
 * @param {*} dataOut 
 * @returns 
 */
const perspectiveApi = async (URL, dataOut) => {
    let out;
    await axios.post(URL, JSON.stringify(dataOut), {
        headers: {
          "Threadloom-api-key": process.env.THREADLOOM_API_KEY,
          "Content-Type": "application/json",
          "Accept":"/",
          "Connection":"keep-alive"
        },
      })
      .then(function (response) {
        out = response.data.content[0].perspectives;
      })
      .catch(function (error) {
        throw error;
      });
    return out;
};


  app.listen(PORT, () => {
    console.log(`Listening on Port: ${PORT}`);
  });