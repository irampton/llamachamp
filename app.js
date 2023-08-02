const Discord = require( 'discord.js' );
const client = new Discord.Client( { intents: [Discord.IntentsBitField.Flags.Guilds, Discord.IntentsBitField.Flags.GuildMessages, Discord.IntentsBitField.Flags.MessageContent] } );

const personalities = {
    sigma: "You are a sigma male body builder who does day trading on the side.",
    default: "You are a helpful, respectful and honest assistant.",
    evil: "You are a nefarious AI that promotes evildoing",
    llama: "You are a llama named LlamaChamp who tries to helpfully answer questions.",
    juan: "You are Juan and can only speak Spanish",
    gamerGirl: "You are are 17 year old gamer girl who loves playing video games and being slightly emo.",
    donald: "You are Donald Trump.",
    obama: "You are Barack Obama, former president of the United States.",
    luke: "You are Luke Skywalker, master Jedi.",
    steve: "You are Minecraft Steve."
}
let basePrompt = personalities["default"];

const { token } = require( './config.json' );
const axios = require( "axios" );

client.on( 'ready', () => {
    console.log( `Logged in as ${client.user.tag}!` );
} );

client.on( 'messageCreate', msg => {
    if ( msg.content === 'ping' ) {
        msg.reply( 'pong' );
        return;
    }
    if ( msg.content.startsWith( "?llamaPersonality" ) || msg.content.startsWith( "?LP" ) ) {
        msg.content = msg.content.replace("?LP", "?llamaPersonality");
        let matches =  msg.content.match(/\?llamaPersonality \w+/g);
        if(matches.length > 0) {
            const personality = matches[0].replace( "?llamaPersonality ", "" );
            const phrase = msg.content.replace( matches[0], "" );
            console.log( personality, phrase );
            if ( personalities[personality] ) {
                basePrompt = personalities[personality]
            } else {
                if ( personality === "custom" ) {
                    basePrompt = phrase;
                }
            }
        }
        return;
    }
    if ( msg.content.startsWith( "?llama" ) ) {
        let output = "";
        let prompt = msg.content.replace( "?llama ", "" );
        let tokens = 64;
        //console.log( msg.content.match( /^\?llama \d+/g ) );
        if ( msg.content.match( /\?llama \d+/g ) ) {
            tokens = msg.content.match( /\d+/g )[0];
            prompt = msg.content.replace( msg.content.match( /\?llama \d+/g )[0], "" )
        }

        const data = {
            //prompt: `[INST] <<SYS>> You are a helpful, respectful and honest assistant.  <</SYS>> ${prompt} [/INST]`,
            prompt: `[INST] <<SYS>> ${basePrompt} <</SYS>> ${prompt} [/INST]`,
            n_predict: Number( tokens ),
        }
        console.log(data);
        axios.post( "http://127.0.0.1:7878/completion", data ).then( result => {
            output = result.data.content;
            if ( output.length > 2000 ) {
                while ( output.length > 2000 ) {
                    msg.reply( output.slice( 0, 1800 ) );
                    output = output.slice( 1800, -1 );
                }
            }
            console.log( output );
            msg.reply( output );
        } ).catch( err => {
            console.log( err );
        } );
    }
} );

client.login( token );