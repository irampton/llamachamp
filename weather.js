const axios = require( "axios" );
const { askLLaMA, handleDiscordError } = require( "./helperFunctions" );
module.exports = {
    sendWeatherReport
}

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
        Promise.resolve( channel.send( { content: msg } ) ).catch( handleDiscordError );
    } );
}