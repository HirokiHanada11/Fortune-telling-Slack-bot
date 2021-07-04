const fetch = require("node-fetch");

//NASA API setup
const apiKeyNasa = 'eiK2DXeB1RBlCUoS4hf5tUcwhcMPclzuWPEZYgFD';
const marsPhotoManiestUrl = `https://api.nasa.gov/mars-photos/api/v1/manifests/Perseverance/?api_key=${apiKeyNasa}`;

//calls all the function in the order in asynchronous mannar 
const latestPhotoMethod = async () => {
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


//creates block with selected photo
const createBlockMethod = async (commandArg, photos) => {
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

module.exports = {
    latestPhoto: latestPhotoMethod,
    createBlock: createBlockMethod
}