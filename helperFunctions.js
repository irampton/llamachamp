const axios = require( "axios" );
module.exports = {
    sendOutput,
    askLLaMA,
    randomInt
};

function sendOutput( msg, send ) {
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

function randomInt( low, high ) {
    return Math.floor( Math.random() * (high - low) ) + low;
}