require('dotenv').config();

// use alternative region for the Amazon transcribe service
const AWS_REGION = process.env.REGION;

// optional : implemeting custom vovabulary or vocabulary filters please see documentation for furter explanation
const VOCABULARY_NAME = process.env.VOCABULARY_NAME;
// setting up the language code for the preffered transcribtion language
var LANGUAGE_CODE = process.env.LANGUAGE_CODE;
// in the aws console or programmatically using aws-sdk or aws-cli you can create a vocabilatry filer consisting of a group of "words" and apply the filet method to them
const VOCABULARY_FILTER = process.env.VOCABULARY_FILTER_NAME;
// TYPE: String | What to do when a word in the vocabulary filter is detected : ["remove", "mask", "tag"]

const VOCABULARY_FILTER_METHOD = process.env.VOCABULARY_FILTER_METHOD;
// setting up samiling rate 16000 HZ seems to be optimal as recommended by AWS documentation
var MediaSampleRateHertz;
MediaSampleRateHertz = 16000;

// set up english as default language if language is not specified
// English is en-US
if (!LANGUAGE_CODE) LANGUAGE_CODE = 'en-US';


// importing sdk for client transcribe streamingm
const {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} = require('@aws-sdk/client-transcribe-streaming');


const StreamAudioToHttp2 = async function () {

//   process.stdin._writableState.highWaterMark = 4096; // Read with chunk size of 3200 as the audio is 16kHz linear PCM
//   process.stdin.resume();
//   process.std

  const toTranscribe = async function* () {
    for await (const chunk of process.stdin) {
      if (chunk.length > 6000) continue;
      yield { AudioEvent: { AudioChunk: chunk } };
    }
  };

  const transcribeClient = new TranscribeStreamingClient({
    region: AWS_REGION,
  });

  const TranscriptionCommand = new StartStreamTranscriptionCommand({
    LanguageCode: LANGUAGE_CODE,
    VocabularyName: VOCABULARY_NAME,
    VocabularyFilterName: VOCABULARY_FILTER,
    VocabularyFilterMethod: VOCABULARY_FILTER_METHOD,
    MediaSampleRateHertz: MediaSampleRateHertz,
    MediaEncoding: 'pcm',
    AudioStream: toTranscribe(),
  });

  const TranscriptionCommandOutput = await transcribeClient.send(
    TranscriptionCommand
  );

  console.log(
    `AWS Transcribe connection status code: ${TranscriptionCommandOutput.$metadata.httpStatusCode}`
  );
  for await (const transcriptionEvent of TranscriptionCommandOutput.TranscriptResultStream) {
    const transcript = transcriptionEvent.TranscriptEvent.Transcript;
    if (transcript) {
      const results = transcript.Results;
      if (results.length > 0) {
        if (results[0].Alternatives.length > 0) {
          let transcript = results[0].Alternatives[0].Transcript;
          // if this transcript segment is final output it to console
		  // fix encoding for accented characters
		  transcript = decodeURIComponent(transcript);
		  // outputing results of only complete sentences
		//   console.clear();
		  console.log(transcript);
		  // use this to check if the transcribtion output is partial or complete send it to AI only if complete
        //   if (!results[0].IsPartial) {
        //   }
        }
      }
    }
  }
};

const startTranscribe = async function () {
  try {
    await StreamAudioToHttp2();
    process.exit(0);
  } catch (error) {
    console.log('Streaming error: ', error);
    process.exit(1);
  }
};

startTranscribe();
