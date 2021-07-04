const { App } = require('@slack/bolt');
const { MongoClient } = require('mongodb');

const dotenv = require("dotenv");
dotenv.config();

//mongoDB setup
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@clusterforslackapp.qqx16.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const dbclient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = "slackAppUsers";

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

//import set of functions for handling fortune commands 
const FortuneHandler = require("./fortuneHandling"); 

//listens for /fortune command and opens a modal
app.command('/fortune', async({ ack, command, body, client }) => {
  await ack();
  try {
    if (command.text === "me"){
      await FortuneHandler.personalizedFortune(body, client, dbName, dbclient);
      console.log("Success: posted personalized fortune for", body.user_name);
    }else if(command.text === "set"){
      await FortuneHandler.setupPersonalizedFortune(body, client);
      console.log("success: personalization setting modal opened for", body.user_name);
    } else{
      await FortuneHandler.defaultFortune(body, client);
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
    const result = await FortuneHandler.fetchFortune(horoscope);
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
    let userDoc = await usersCol.findOne(query);
    if(await userDoc === null){
    // Insert a single document, wait for promise so we can read it back
      const p = await usersCol.insertOne(userDocument);
    // Find one document
      let userDoc = await usersCol.findOne(query);
    // Print to the console
      console.log("Inserted\n", userDoc);
    }else {//if the the data exists, update
      let newUrlArr = userDoc.favPhoto.concat(url) 
      let updateUserDocument = {
        $set: {
          "horoscope": horoscope,                                                                                                                                   
          "favPhoto": newUrlArr
        }
      }
      //update one element 
      const q = await usersCol.updateOne(query, updateUserDocument);
      // Find one document
      let myDoc = await usersCol.findOne();
      // Print to the console
      console.log("Updated\n", myDoc);
    }
   } catch (err) {
    console.log(err.stack);
  }
}

//import functions for handling mars command 
const marsHanler = require('./marsHandling');
//listens for /mars command
app.command('/mars', async({ command, ack, say }) => {
  await ack();
  try {
    const marsPhotos = await marsHanler.latestPhoto();
    //console.log(marsPhotos);
    let block = await marsHanler.createBlock(command.text, marsPhotos.photos);   
    
    await say({
      blocks :block
    })
    
  }
  catch (error) {
    console.error(error);
  }
});

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