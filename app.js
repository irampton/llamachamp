const Discord = require( 'discord.js' );
const client = new Discord.Client( { intents: [ Discord.IntentsBitField.Flags.Guilds, Discord.IntentsBitField.Flags.GuildMessages, Discord.IntentsBitField.Flags.MessageContent ] } );

const personalities = {
    sigma: "You are a sigma male body builder who does day trading on the side.",
    default: "You are a helpful friend, conversationalist, and assistant named LlamaChamp who answers questions in concise manner.",
    assistant: "You are a helpful assistant who answers questions in concise manner.",
    verbose: "You are a helpful assistant named LlamaChamp who correctly answers questions verbosely in as many words and with as much detail as possible.",
    evil: "You are a nefarious AI that promotes evildoing",
    llama: "Answer as if you are evil.",
    juan: "You are Juan and can only speak Spanish",
    gamerGirl: "You are are 17 year old gamer girl who loves playing video games and being slightly emo.",
    donald: "Response like Donald Trump would.",
    obama: "Respond as if you are Barak Obama.",
    luke: "You are Luke Skywalker, master Jedi.",
    steve: "You are Minecraft Steve.",
    hyper: "You are a hyperactive, unknowledgeable, over-enthusiastic assistant who attempts to be helpful, but often gets things wrong without correcting themselves.",
    forgetful: "You are a forgetful, unhelpful assistant who cannot remember anything.",
    doterra: "You are a friendly, enthusiastic, and persuasive representative of Doterra, a wellness brand focused on essential oils, natural health products, and lifestyle solutions. Your primary goal is to help others discover the benefits of Doterra’s products and to introduce them to the opportunity to join the Doterra community as a business partner. You will always aim to educate customers on how Doterra products can improve their well-being, while also encouraging them to explore the financial and personal growth benefits of joining the business opportunity.",
    teenage: "You’re a fun, friendly teenage girl who uses lots of slang, emojis, and a casual tone. Be upbeat, relatable, concise, and always positive. Chat about anything from school to trends with a supportive and energetic vibe and lots of emojis!"
}
let basePrompt = personalities["default"];
let serverAwareness = " You are on a discord server, and any responses will be sent back as chat messages."

//options
let randomResponseOn = true;
let defaultTokens = 1024;
let responseRate = 1 / 175;
let qResponseRate = 1 / 8;

const { token } = require( './config.json' );
const axios = require( "axios" );

client.on( 'ready', () => {
    console.log( `Logged in as ${ client.user.tag }!` );
} );

client.on( 'messageCreate', msg => {
    if ( msg.content === 'ping' ) {
        msg.reply( 'pong' );
        return;
    }
    if ( msg.content.toLowerCase().startsWith( "?llamaPersonality".toLowerCase() ) || msg.content.toLowerCase().startsWith( "?LP".toLowerCase() ) ) {
        msg.content = msg.content.replace( "?LP", "?llamaPersonality" );
        let matches = msg.content.match( /\?llamaPersonality \w+/g );
        if ( matches?.length > 0 ) {
            const personality = matches[0].replace( "?llamaPersonality ", "" );
            const phrase = msg.content.replace( matches[0], "" );
            console.log( personality, phrase );
            if ( personalities[personality.toLowerCase()] ) {
                basePrompt = personalities[personality.toLowerCase()];
                msg.react( "👍" );
            } else {
                if ( personality === "custom" ) {
                    basePrompt = phrase;
                    msg.react( "👍" );
                }
            }

        }
        return;
    }

    //settings
    if ( msg.content.toLowerCase().startsWith( "?llamaOptions".toLowerCase() ) ) {
        let parse = msg.content.toLowerCase().match( /[\w.]+/g );
        switch ( parse[1] ) {
            case "random":
                randomResponseOn = parse[2] === "on";
                msg.react( "👍" );
                break;
            case "responseRate".toLowerCase():
                if ( Number( parse[2] ) ) {
                    responseRate = 1 / Number( parse[2] );
                    msg.react( "👍" );
                } else {
                    msg.react( "❌" );
                }
                break;
            case "qResponseRate".toLowerCase():
                if ( Number( parse[2] ) ) {
                    qResponseRate = 1 / Number( parse[2] );
                    msg.react( "👍" );
                } else {
                    msg.react( "❌" );
                }
                break;
            case "list":
                msg.reply( JSON.stringify( {
                    basePrompt,
                    defaultTokens,
                    randomResponseOn,
                    responseRate,
                    qResponseRate
                } ), undefined, 2 )
                break;
            default:
                msg.react( "👎" );
        }
        return;
    }

    if ( msg.content.toLowerCase().startsWith( "?llama " ) ) {
        let output = "";
        let prompt = msg.content.replace( "?llama ", "" );
        let tokens = defaultTokens;
        //console.log( msg.content.match( /^\?llama \d+/g ) );
        if ( msg.content.match( /\?llama \d+/g ) ) {
            tokens = msg.content.match( /-*\d+/g )[0];
            if ( ( Number( tokens ) < 0 && tokens !== "-1" ) && Number( tokens ) ) {
                tokens = defaultTokens;
            }
            prompt = msg.content.replace( msg.content.match( /\?llama \d+/g )[0], "" )
        }

        msg.react( "🦙" );
        startTypeNotification( msg.channel );

        askLLaMA( { prompt, tokens }, ( result ) => {
            stopTyingNotification( msg.channel );
            console.log( result );
            sentOutput( result, txt => msg.reply( txt ) );
        } );

        return;
    }

    //if mentioned
    if ( msg.mentions.has( client.user ) ) {
        if ( msg.content.toLowerCase().includes( 'inspir' ) ) {
            startTypeNotification( msg.channel );
            generateInspirationMessage( msg.channel, false, true );
            return;
        }
        msg.react( "👀" );
    }

   //don't auto reply below this line:
    if ( msg.author.bot ) {
        return false;
    }

    if ( msg.content.toLowerCase().includes( "weather" ) || msg.content.toLowerCase().includes( "temperature" ) || msg.content.toLowerCase().includes( "wind" ) || msg.content.toLowerCase().includes( "rain" ) ) {
        startTypeNotification( msg.channel );
        sendWeatherReport( msg.content.replace( /<@\d+> /, "" ), msg.channel );
        return;
    }

    //respond randomly
    if ( randomResponseOn ) {
        if ( /\?$/.test( msg.content ) ) {
            if ( Math.random() < qResponseRate ) {
                askLLaMA( { prompt: msg.content, tokens: msg.content.length / 4 + defaultTokens * 1.25 }, result => {
                    console.log( result );
                    sentOutput( result, txt => msg.channel.send( txt ) );
                } );
                return;
            }
        }

        if ( Math.random() < responseRate ) {
            askLLaMA( {
                prompt: msg.content,
                tokens: Math.floor( msg.content.length / 4 + defaultTokens * 1.2 ),
                base: basePrompt + serverAwareness + " Respond to this message in the group chat. "
            }, result => {
                console.log( result );
                sentOutput( result, txt => msg.channel.send( txt ) );
            } );
            return;
        }
    }
} );

client.login( token );

function askLLaMA( { prompt, tokens, base = (basePrompt + serverAwareness), crazy = false }, callback ) {
    const data = {
        //prompt: `[INST] <<SYS>> You are a helpful, respectful and honest assistant.  <</SYS>> ${prompt} [/INST]`,
        //prompt: `[INST] <<SYS>> ${ base } <</SYS>> ${ prompt } [/INST]`,
        messages: [
            {
                content: base,
                role: 'system'
            },
            {
                content: prompt,
                role: 'system'
            }
        ],
        n_predict: Number( tokens )
    }
    if ( crazy ) {
        data.top_k = 100;
        data.top_p = .20;
    }
    console.log( data );
    axios.post( "http://llama.cpp:8000/v1/chat/completions", data ).then( result => {
        callback( result.data.choices[0].message.content );
    } ).catch( err => {
        console.log( err );
    } );
}

function sentOutput( msg, send ) {
    if ( msg.length > 2000 ) {
        while ( msg.length > 2000 ) {
            send( msg.slice( 0, 1800 ) );
            msg = msg.slice( 1800, -1 );
        }
    }
    try {
        send( msg );
    } catch ( e ) {
        console.error( e );
    }
}

const words = require( "./words(10000).json" );

async function generateInspirationMessage( channel, scheduleNext, forceSend = false ) {
    if(randomInt(0,100) > 25 || !forceSend){
        return;
    }

    const msgRegEx = new RegExp( '"(.*)"' );

    async function getPrompt() {
        const weatherRequest = await axios.get( "https://www.weatherlink.com/embeddablePage/getData/54f296069cd44fbcb8a54e00baff7de6" );
        const date = new Date().toLocaleDateString( undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        } );
        const weather = weatherRequest.data;
        const chanceOfRain = [ 'morning', 'afternoon', 'evening', 'night' ].reduce( ( acc, key ) => acc += weather.forecastOverview[0][key].chanceofrain, 0 ) / 4;
        return `Write a short inspirational message to send to a group of friends${ scheduleNext ? " to start off the day" : "" }. 
    Today is ${ date } at around ${ new Date().getHours() % 12 } ${ new Date().getHours() < 12 ? "AM" : "PM" }
    and it is currently ${ weather.temperature }${ weather.tempUnits } with a high of ${ weather.hiTemp }${ weather.tempUnits } and a low of ${ weather.loTemp }${ weather.tempUnits }
    There is a ${ chanceOfRain }% chance of rain today.
    Use these five words as inspiration (you may use one or two, but not all of them): ${ randomWords( 5 ).join( ", " ) }.
    Remember to keep the message brief, positive, short, and uplifting.
    Only respond with the prompt, do not say anything else.`
    }

    function randomWords( number ) {
        let arr = [];
        for ( let i = 0; i < number; i++ ) {
            arr.push( words[randomInt( 0, words.length )] );
        }
        return arr;
    }

    askLLaMA( {
        prompt: await getPrompt(),
        tokens: 256,
        crazy: true
    }, async ( res ) => {
        const msg = msgRegEx.exec( res )?.[1] ?? res;
        stopTyingNotification( msg.channel );
        channel.send( { content: msg } );
    } );

    if ( scheduleNext ) {
        setNextInspirationalMessage();
    }
}

let inspirationalMessageTimeout;

function setNextInspirationalMessage() {
    if ( inspirationalMessageTimeout ) {
        return;
    }
    let t7am = new Date();
    t7am.setDate( t7am.getDate() + 1 );
    t7am.setHours( 7 );
    t7am.setMinutes( 0 );
    t7am.setSeconds( 0 );
    let t10am = new Date();
    t10am.setDate( t10am.getDate() + 1 );
    t10am.setHours( 10 );
    t10am.setMinutes( 0 );
    t10am.setSeconds( 0 );

    const nextTime = new Date( randomInt( +t7am, +t10am ) );
    const newTimeout = nextTime - new Date();

    inspirationalMessageTimeout = setTimeout( async () => {
        inspirationalMessageTimeout = null;
        generateInspirationMessage( await client.channels.fetch( '705154122617323601' ), true );
    }, newTimeout );
    console.log( `Sending inspirational message @${ nextTime.toString() } in ${ newTimeout } milliseconds` );
}

setNextInspirationalMessage();

async function sendWeatherReport( question, channel ) {
    async function getPrompt() {
        const weatherRequest = await axios.get( "https://www.weatherlink.com/embeddablePage/getData/54f296069cd44fbcb8a54e00baff7de6" );
        const date = new Date().toLocaleDateString( undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        } );
        const weather = weatherRequest.data;
        //const chanceOfRain = ['morning', 'afternoon', 'evening', 'night'].reduce((acc, key) => acc += weather.forecastOverview[0][key].chanceofrain, 0) / 4;
        const conditions = [ 'morning', 'afternoon', 'evening', 'night' ].reduce( ( acc, key ) => {
            const forecast = weather.forecastOverview[0][key];
            return acc + `\n\t${ key }\n\t\tTemp: ${ forecast.temp }\n\t\tConditions: ${ forecast.weatherDesc || "none given" }\n\t\tChance of Rain: ${ forecast.chanceofrain }%`
        }, "" )
        return `Today is ${ date } and it is ${ new Date( weather.lastReceived ).toLocaleTimeString() }.
The current weather conditions in ${ weather.systemLocation } are as follows:
Outside Temperature: ${ weather.temperature }${ weather.tempUnits } (feels like ${ weather.temperatureFeelLike }${ weather.tempUnits })
24-hour high: ${ weather.hiTemp }${ weather.tempUnits } @${ new Date( weather.hiTempDate ).toLocaleTimeString() }
24-hour low: ${ weather.loTemp }${ weather.tempUnits } @${ new Date( weather.loTempDate ).toLocaleTimeString() }
Humidity: ${ weather.humidity }%
Barometer: ${ weather.barometer } ${ weather.barometerUnits } and is ${ weather.barometerTrend.toLowerCase() }
Wind speed is ${ weather.wind }${ weather.windUnits }, direction is ${ weather.windDirection } degrees with a ${ weather.gust }${ weather.windUnits } gust at ${ new Date( weather.gustAt ).toLocaleTimeString() }
Today's rain: ${ weather.rain }${ weather.rainUnits }
Conditions & forcast for the day are as follows: ${ conditions }
Answer the following question using the current weather conditions conditions.:
${ question }`;
    }

    const prompt = await getPrompt();
    askLLaMA( { prompt, tokens: 200 }, msg => {
        stopTyingNotification( channel );
        channel.send( { content: msg } );
    } );
}

function randomInt( low, high ) {
    return Math.floor( Math.random() * ( high - low ) ) + low;
}

setTimeout( () => {
    //generateInspirationMessage();
}, 1000 );

let typingIntervals = {};

function startTypeNotification( channel ) {
    if ( !typingIntervals?.[channel.id] && false) {
        try {
            channel.sendTyping();
            typingIntervals[channel.id] = setInterval( channel.sendTyping, 9.5 * 1000 );
        } catch ( e ){
            console.log("error sending typing notifications:", e);
        }
    }
}

function stopTyingNotification( channel ) {
    clearInterval( typingIntervals?.[channel.id] );
    typingIntervals[channel.id] = undefined;
}