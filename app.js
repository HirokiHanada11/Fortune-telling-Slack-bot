const { App } = require('@slack/bolt');

// Initializes your app with your bot token and signing secret
const app = new App({
  token: "xoxb-2216499267651-2250635640657-IwbIlsHuMh2eFXWKqQtet9zt",
  signingSecret: "a1583867411c5482e08ba11d91b56068"
});
// モンゴ
const { MongoClient } = require("mongodb");

// Replace the uri string with your MongoDB deployment's connection string.
const uri =
  "mongodb+srv://masato:jxNKKx6pmn@@4wE@cluster0.t0afd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
  
const dbclient = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


// スラッシュコマンド/post
app.command('/post', async ({ command, ack, say, client, body }) => {
  // Acknowledge command request
  await ack();
  await app.client.reminders.add({
    token: "xoxp-2216499267651-2209799304054-2238251250099-149d3a1993f084640f8c4dd6457cc642",
    text: "delete",
    time: 1155
  }
  )
  try {
    
    const result = await client.views.open({
      // 適切な trigger_id を受け取ってから 3 秒以内に渡す
      trigger_id: body.trigger_id,
      // view の値をペイロードに含む
      view: {
        type: 'modal',
        // callback_id が view を特定するための識別子
        callback_id: 'view_1',
        "title": {
          "type": "plain_text",
          "text": "Modal Title"
        },
        "submit": {
          "type": "plain_text",
          "text": "Submit"
        },
        "blocks": [
          {
            "type": "input",
            "block_id": "block1",
            "element": {
              "type": "plain_text_input",
              "action_id": "sl_input",
              "placeholder": {
                "type": "plain_text",
                "text": "Placeholder text for single-line input"
              }
            },
            "label": {
              "type": "plain_text",
              "text": "Label"
            },
            "hint": {
              "type": "plain_text",
              "text": "Hint text"
            }
          },
          {
            "type": "input",
            "block_id": "block2",
            "element": {
              "type": "plain_text_input",
              "action_id": "ml_input",
              "multiline": true,
              "placeholder": {
                "type": "plain_text",
                "text": "Placeholder text for multi-line input"
              }
            },
            "label": {
              "type": "plain_text",
              "text": "Label"
            },
            "hint": {
              "type": "plain_text",
              "text": "Hint text"
            }
          },
          {
            "type": "input",
            "block_id": "block3",
            "element": {
              "type": "datepicker",
              "initial_date": "1990-04-28",
              "placeholder": {
                "type": "plain_text",
                "text": "Select a date",
                "emoji": true
              },
              "action_id": "datepicker"
            },
            "label": {
              "type": "plain_text",
              "text": "Label",
              "emoji": true
            }
          }
        ],
      }
    });
    console.log(result);
  }
  catch (error) {
    console.error(error);
  }
  // await say(`${command.text}`);
});
// モーダルでのデータ送信イベントを処理します
app.view('view_1', async ({ ack, body, view, client }) => {
  // モーダルでのデータ送信イベントを確認
  await ack();

  // 入力値を使ってやりたいことをここで実装 - DB に保存して送信内容の確認を送っている

  // block_id: block_1 という input ブロック内で action_id: input_a の場合の入力
  const pizzaDocument = {
     title : view.state.values.block1.sl_input.value,
     text : view.state.values.block2.ml_input.value,
     date : view.state.values.block3.datepicker.value,
     user : body['user']['id']
  };
  const user = body['user']['id'];
  // ユーザーに対して送信するメッセージ
  let msg = '';
  // DB に保存
  const database = dbclient.db("masato");
  const movies  = database.collection("movies");
  const results = await movies.insertOne(pizzaDocument);

  if (results) {
    // DB への保存が成功
    msg = 'Your submission was successful';
  } else {
    msg = 'There was an error with your submission';
  }

  // ユーザーにメッセージを送信
  try {
    
    
    // const apple = {
      //   title: "a",
      //   text: "b",
      //   date: 2
      // }
      
      // const database = dbclient.db("masato");
      // const movies = database.collection("movies");
      // const dt = await movies.findOne(pizzaDocument); 
      
      await client.chat.postMessage({
      channel: user,
      text: msg,
      
      blocks: [
        {
          "type": "section",
          "text": {
            "type": "plain_text",
            "text": "dt.date",
            "emoji": true
          }
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "plain_text",
              "text": "dt.title",
              "emoji": true
            },
            {
              "type": "plain_text",
              "text": "dt.text",
              "emoji": true
            },
            
          ]
        }
      ],
    });
  }
  catch (error) {
    console.error(error);
  }

});
(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);
  await dbclient.connect();
  console.log('⚡️ Bolt app is running!');
})();