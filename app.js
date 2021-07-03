const { App } = require('@slack/bolt');
const fetch = require("node-fetch");
const { MongoClient } = require('mongodb');

//mongoDB setup
const uri = process.env.MONGODB_URI;
const dbclient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = "slackAppUsers";

//NASA API setup
const apiKeyNasa = 'eiK2DXeB1RBlCUoS4hf5tUcwhcMPclzuWPEZYgFD';
const marsPhotoManiestUrl = `https://api.nasa.gov/mars-photos/api/v1/manifests/Perseverance/?api_key=${apiKeyNasa}`;

//slack block for options in select inputs
const options_horo = [
  {
    "text": {
      "type": "plain_text",
      "text": "牡羊座"
    },
    "value": "牡羊座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "牡牛座"
    },
    "value": "牡牛座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "双子座"
    },
    "value": "双子座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "蟹座"
    },
    "value": "蟹座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "獅子座"
    },
    "value": "獅子座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "乙女座"
    },
    "value": "乙女座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "天秤座"
    },
    "value": "天秤座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "蠍座"
    },
    "value": "蠍座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "射手座"
    },
    "value": "射手座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "山羊座"
    },
    "value": "山羊座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "水瓶座"
    },
    "value": "水瓶座"
  },
  {
    "text": {
      "type": "plain_text",
      "text": "魚座"
    },
    "value": "魚座"
  }
]

//slack block for select input
const selection_block = {
  "action_id": "select_horo",
  "type": "static_select",
  "placeholder": {
    "type": "plain_text",
    "text": "星座"
  },
  "options": options_horo
}

//slack block for setting modal
const setting_modal_block = [
  {
    "type": "input",
    "block_id": "static_select",
    "element": {
      "type": "static_select",
      "placeholder": {
        "type": "plain_text",
        "text": "星座",
        "emoji": true
      },
      "options": options_horo,
      "action_id": "static_select_horoscope"
    },
    "label": {
      "type": "plain_text",
      "text": "あなたの星座",
      "emoji": true
    }
  },
  {
    "type": "input",
    "block_id": "multi_line_input",
    "element": {
      "type": "plain_text_input",
      "multiline": true,
      "placeholder": {
        "type": "plain_text",
        "text": "複数送れます！（複数送る場合は改行区切りで）",
        "emoji": true
      },
      "action_id": "plain_text_input_photo"
    },
    "label": {
      "type": "plain_text",
      "text": "不運な時に励ましてくれる写真のURL",
      "emoji": true
    }
  }
]

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

//listens for /fortune command and opens a modal
app.command('/fortune', async({ ack, command, body, client }) => {
  await ack();

  try {
    if (command.text === "me"){
      await personalizedFortune(body, client);
      console.log("Success: posted personalized fortune for", body.user_name);
    }else if(command.text === "set"){
      await setupPersonalizedFortune(body, client);
      console.log("success: personalization setting modal opened for", body.user_name);
    } else{
      await defaultFortune(body, client);
      console.log("success: opened default menu for",body.user_name)
    }
  }
  catch (error) {
    console.error(error);
  }
});

//when one of the buttons on the modal is clicked, it pushes another modal with fortune telling results
app.action('select_horo', async({ ack, body, client}) => {
  await ack();
  try{
    const horoscope = body.actions[0].selected_option.value;
    const result = await fetchFortune(horoscope);
    // Call views.open with the built-in client
    await client.views.push({
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: {
        type: 'modal',
        // View identifier
        callback_id: 'view_2',
        title: {
          type: 'plain_text',
          text: '今日の運勢'
        },
        blocks: [
          {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": `${result["matched"].sign}の今日の運勢は、、、${result["matched"].rank}位${result["emojiFace"]}`,
              "emoji": true
            }
          },
          {
            "type": "context",
            "elements": [
              {
                "type": "plain_text",
                "text": result["matched"].content,
                "emoji": true
              }
            ]
          },
          {
            "type": "context",
            "elements": [
              {
                "type": "plain_text",
                "text": `ラッキーアイテムは${result["matched"].item}`,
                "emoji": true
              }
            ]
          },
          {
            "type": "divider"
          },
          {
            "type": "image",
            "image_url": `https://quickchart.io/chart?c=${result["encodedRadarChart"]}`,
            "alt_text": "radar chart"
          },
          {
            "type": "context",
            "elements": [
              {
                "type": "plain_text",
                "text": `金運：${result["matched"].money}  恋愛運：${result["matched"].love}　職運：${result["matched"].job}`,
                "emoji": true
              }
            ]
          },
          {
            "type": "context",
            "elements": [
              {
                "type": "plain_text",
                "text": '今日も一日頑張ろう！！',
                "emoji": true
              }
            ]
          }
        ]
      }
    });
    console.log("Success: posted today's fortune for", result["matched"].sign);
  } catch(err) {
    console.error(err)
  }  
});

//submit handling for modal form and saving it to the mongodb database
app.view("modal-with-inputs", async({ ack, body, client}) => {
  await ack();
  try{
    const userId = await body.user.id;
    const username = await body.user.username;
    const horoscope = await body.view.state.values.static_select.static_select_horoscope.selected_option.value;
    const favPhotoUrlstr = await body.view.state.values.multi_line_input.plain_text_input_photo.value;
    const favPhotoUrlArr = await favPhotoUrlstr.split('\n');
    console.log("successfully received submission"); 

    console.log(favPhotoUrlArr);
    await storeUserInfo(userId, username, horoscope, favPhotoUrlArr);
    console.log("Success: stored user information in the database.")
    await client.views.open({
      // Pass a valid trigger_id within 3 seconds of receiving it
      "trigger_id": body.trigger_id,
      // View payload
      "view": {
        "type": 'modal',
        // View identifier
        "callback_id": 'view_end',
        "title": {
          "type": 'plain_text',
          "text": 'ご記入ありがとうございました！'
        },
        "blocks": [
          {
            "type": "section",
            "block_id": "section_pick_horo",
            "text": {
              "type": "mrkdwn",
              "text": "/fortune me で自分宛ての占いを見てみましょう！"
            }
          }
        ]
      }
    })
  } catch(err){
    console.error(err);
  }
})

const defaultFortune = async (body, client) => {
  try {
    await client.views.open({
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: {
        type: 'modal',
        // View identifier
        callback_id: 'view_1',
        title: {
          type: 'plain_text',
          text: '今日の運勢チェック！'
        },
        blocks: [
          {
            "type": "section",
            "block_id": "section_pick_horo",
            "text": {
              "type": "mrkdwn",
              "text": "星座を選んで今日の運勢を確認しよう！"
            },
            "accessory": selection_block
          }
        ]
      }
    });
    console.log("Success: posted modal for picking horoscope");
  } catch (error) {
    console.errot(error);
  }
}

//personalized fortune, uses user's id to retrieve their horoscope and photo
const personalizedFortune = async (body, client) => {
  try {
    const slackAppUsersdb = dbclient.db(dbName);
    // Use the collection "users"
    const usersCol = slackAppUsersdb.collection("users");
    //query to retrieve user data 
    let query = { "id": body.user_id };
    let userDoc = await usersCol.findOne(query); //retrieving data from db
    const horoscope = await userDoc.horoscope;
    const randomIndex = await Math.floor(Math.random() * userDoc.favPhoto.length)
    const favPhotoUrl = await userDoc.favPhoto[randomIndex];
    const result = await fetchFortune(horoscope);
    await client.views.open({
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: {
        type: 'modal',
        // View identifier
        callback_id: 'view_2',
        title: {
          type: 'plain_text',
          text: '今日の運勢'
        },
        blocks: [
          {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": `${userDoc.username}さんの今日の運勢は、、、${result["matched"].rank}位${result["emojiFace"]}\n(${result["matched"].sign})`,
              "emoji": true
            }
          },
          {
            "type": "context",
            "elements": [
              {
                "type": "plain_text",
                "text": result["matched"].content,
                "emoji": true
              }
            ]
          },
          {
            "type": "context",
            "elements": [
              {
                "type": "plain_text",
                "text": `ラッキーアイテムは${result["matched"].item}`,
                "emoji": true
              }
            ]
          },
          {
            "type": "divider"
          },
          {
            "type": "image",
            "image_url": `https://quickchart.io/chart?c=${result["encodedRadarChart"]}`,
            "alt_text": "radar chart"
          },
          {
            "type": "context",
            "elements": [
              {
                "type": "plain_text",
                "text": `金運：${result["matched"].money}  恋愛運：${result["matched"].love}　職運：${result["matched"].job}`,
                "emoji": true
              }
            ]
          },          
          {
            "type": "image",
            "image_url": favPhotoUrl,
            "alt_text": "radar chart"
          },
          {
            "type": "context",
            "elements": [
              {
                "type": "plain_text",
                "text": '今日も一日頑張ろう！！',
                "emoji": true
              }
            ]
          }
        ]
      }
    });
    console.log("Success: posted today's personalized fortune");
  } catch (error) {
    console.error(error);
  }
}

//show the modal for setting up personalized fortune by 
const setupPersonalizedFortune = async (body, client) => {
  try {
    // Call views.open with the built-in client
    await client.views.open({
      // Pass a valid trigger_id within 3 seconds of receiving it
      "trigger_id": body.trigger_id,
      // View payload
      "view": {
        "type": "modal",
        "callback_id": "modal-with-inputs",
        "title": {
          "type": "plain_text",
          "text": "星座占い設定"
        },
        "blocks": setting_modal_block,
        "submit": {
          "type": "plain_text",
          "text": "Submit"
        }
      }
    });
    console.log("posted settings Modal");
  }
  catch (error) {
    console.error(error);
  }
}

//mongodb storing data to slackAppUsers database
const storeUserInfo = async (id, username, horoscope, url) =>{
  try {
    const slackAppUsersdb = dbclient.db(dbName);
    // Use the collection "users"
    const usersCol = slackAppUsersdb.collection("users");
    // Construct a document                                                                                                                                                              
    let userDocument = {
        "id": id,
        "username": username,                                                                                                                               
        "horoscope": horoscope,                                                                                                                               
        "favPhoto": url
    }
    //query to check if the data does not exist in the database
    let query = { "id": id };
    //if data does not exist
    if(await usersCol.findOne(query) == null){
    // Insert a single document, wait for promise so we can read it back
      const p = await usersCol.insertOne(userDocument);
    // Find one document
      const myDoc = await usersCol.findOne(query);
    // Print to the console
      console.log("Inserted\n", myDoc);
    }else {//if the the data exists, update
      let updateUserDocument = {
        $set: {
          "horoscope": horoscope,                                                                                                                                   
          "favPhoto": url
        }
      }
      //update one element 
      const q = await usersCol.updateOne(query, updateUserDocument);
      // Find one document
      const myDoc = await usersCol.findOne();
      // Print to the console
      console.log("Updated\n", myDoc);
    }
   } catch (err) {
    console.log(err.stack);
  }
}

//fetches fortune telling results from the fortune telling api
const fetchFortune = async (horoscope) => {
  try{
    const date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();

    const url = `http://api.jugemkey.jp/api/horoscope/free/${year}/${month}/${date}`;
    const response = await fetch(url);
    const responsejson = await response.json();
    const fortune = await responsejson.horoscope[`${year}/${month}/${date}`];
    const matched = await fortune.find((fort, index) => {return fort.sign == horoscope});
    
    const emojiFace = await emojiSwtich(matched.rank);
    const colorCode = await japToColorCode(matched.color);
    const radarChart = await createRadarChart(matched.money, matched.job, matched.love, colorCode);
    const encodedRadarChart = await encodeURIComponent(JSON.stringify(radarChart));

    return {
      "matched": matched,
      "emojiFace": emojiFace,
      "encodedRadarChart": encodedRadarChart
    }
  } catch(err){
      console.error(err);
  }
}

//function for sending different emojis for different ranks 
const emojiSwtich = async (rank) => {
  let faceEmoji ='';
  switch(rank) {
    case 11: case 12:
      faceEmoji = ':scream:';
      break;
    case 9: case 10:
      faceEmoji = ':dizzy_face:';
      break;
    case 7: case 8:
      faceEmoji = ':slightly_frowning_face:';
      break;
    case 4: case 5: case 6:
      faceEmoji = ':relieved:';
      break;
    case 2: case 3:
      faceEmoji = ':blush:';
      break; 
    case 1:
      faceEmoji = ':satisfied:';
      break;
  }
  return faceEmoji;
}

//creates radar chart for the money, job, and love fortune
const createRadarChart = async (money, job, love, color) => {
  const data = {
    labels: [
      '金運',
      '職運',
      '恋愛運'
    ],
    datasets: [{
      label: 'ラッキーカラー',
      data: [money, job, love],
      fill: true,
      backgroundColor: `rgba(${color}, 0.2)`,
      borderColor: 'rgb(${color})',
      pointBackgroundColor: 'rgb(${color})',
      pointBorderColor: '#fff'
    },
    {
      label: '',
      data: [5, 5, 5],
      fill: false,
      borderColor: 'rgba(0, 0, 0, 0)',
      pointBackgroundColor: 'rgba(0, 0, 0, 0)',
      pointBorderColor: 'rgba(0, 0, 0, 0)'
    },
    {
      label: '',
      data: [0, 0, 0],
      fill: false,
      borderColor: 'rgba(0, 0, 0, 0)',
      pointBackgroundColor: 'rgba(0, 0, 0, 0)',
      pointBorderColor: 'rgba(0, 0, 0, 0)'
    }
  ]
  }
  const config = {
    type: 'radar',
    data: data,
    options: {
      scales: {
        r: {
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1
          }
        }
      }
    },
  }
  return config;
}

//converts colors in katakana to rgb components
const japToColorCode = async (color) => {
  const obj = {
    'ブラック':'30, 30, 30',
    'ホワイト':'220, 220, 220',
    'ブルー':'0, 0, 255',
    'グリーン':'0, 255, 0',
    'レッド':'255, 0, 0',
    'ピンク':'255, 105, 180',
    'パープル':'128, 0, 128',
    'イエロー':'255, 255, 0',
    'オレンジ':'255, 165, 0',
    'グレイ':'128, 128, 128',
    'ゴールド':'255, 215, 0',
    'シルバー':'192, 192, 192'
  }
  return obj[color];
}

//listens for /mars command
app.command('/mars', async({ command, ack, say }) => {
  await ack();
  try {
    const marsPhotos = await latestPhoto();
    //console.log(marsPhotos);
    let block = await createBlock(command.text, marsPhotos.photos);   
    
    await say({
      blocks :block
    })
    
  }
  catch (error) {
    console.error(error);
  }
});
//find the latest sol that includes mast cam
const latestMastSol = async () => {
  try {
    const res = await fetch(marsPhotoManiestUrl);
    const manifest  = await res.json();
    const latestMCZ = await findLatestWithMCZ(manifest.photo_manifest.photos);
    return latestMCZ;
  } catch (error) {
    console.error(error);
  }
}

//looks in to the array searching for the mcz 
const findLatestWithMCZ = async (photos) => {
  for (const sol of photos.reverse()){
    if (sol.cameras.includes("MCZ_LEFT")){
      return sol.sol;
    }
  }
  return 0;
}

//creates an url with the sol found above 
const createMarsPhotoUrl = async (sol, apiKey) => {
  return `https://api.nasa.gov/mars-photos/api/v1/rovers/perseverance/photos?sol=${sol}&camera=mcz_left&page=1&api_key=${apiKey}`;
}

//calls all the function in the order in asynchronous mannar 
const latestPhoto = async () => {
  try {
    const maxSol = await latestMastSol();
    const url = await createMarsPhotoUrl(maxSol, apiKeyNasa);
    const res = await fetch(url);
    const marsPhotos = await res.json();
    return marsPhotos;
  } catch (error) {
    console.error(error);
  }
}

//creates block with selected photo
const createBlock = async (commandArg, photos) => {
  let newArg = 0;
  if (parseInt(commandArg)!=NaN && parseInt(commandArg)>=1 && parseInt(commandArg)<=25){
    newArg = parseInt(commandArg) - 1;
  } 
  const block = [{
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "今日の火星",
        "emoji": true
      }
    },
    {
      "type": "section",
      "text": {
        "type": "plain_text",
        "text": `Sol: ${photos[newArg].sol}, Earth date: ${photos[newArg].earth_date} \n photo taken by ${photos[newArg].camera.full_name} of NASA's ${photos[newArg].rover.name} Rover\n photo ${newArg+1}/25`,
        "emoji": true
      }
    },
    {
      "type": "image",
      "image_url": photos[newArg].img_src,
      "alt_text": `Sol: ${photos[newArg].sol}, ${photos[newArg].earth_date} \n photo taken by ${photos[newArg].camera.full_name} of ${photos[newArg].rover.name}`
    },
    {
      "type": "section",
      "text": {
        "type": "plain_text",
        "text": '今日も宇宙人はいない模様、、、:alien:',
        "emoji": true
      }
    }];
    return block; 
}

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();

(async () => {
  try{
    await dbclient.connect();
    console.log("Connected correctly to MongoDB server");
  } catch(error) {
    console.error(error);
  }
})();

process.on('SIGTERM', async () => {
  try{
    await dbclient.close();
    console.log("Correctly closed connection to server");
  } catch(error) {
    console.error(error);
  }
})