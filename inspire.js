module.exports = {
    generateInspirationMessage,
    setNextInspirationalMessage
}

const words = require( "./words(10000).json" );
const axios = require( "axios" );
const { askLLaMA, randomInt } = require( "./helperFunctions" );

async function generateInspirationMessage( channel, scheduleNext, forceSend = false ) {
    if ( randomInt( 0, 100 ) > 25 && !forceSend ) {
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
        channel.send( { content: msg } );
    } );

    if ( scheduleNext ) {
        setNextInspirationalMessage();
    }
}

let inspirationalMessageTimeout;

function setNextInspirationalMessage( channel ) {
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

    inspirationalMessageTimeout = setTimeout( () => {
        inspirationalMessageTimeout = null;
        generateInspirationMessage( channel, true );
    }, newTimeout );
    console.log( `Sending inspirational message @${ nextTime.toString() } in ${ newTimeout } milliseconds` );
}
