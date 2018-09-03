import * as functions from 'firebase-functions';
import axios from 'axios';


// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

const _GOOGLE_TEXTSEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const _GOOGLE_AUTOSEARCH_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";

const CORS = require('cors')({origin:true});

export const helloWorld = functions.https.onRequest((request, response) => {
 response.send("Hello from Firebase!");
});

/// This is for textsearch google places api
export  const searchPlace = functions.https.onRequest( (req,res) => {
  CORS( req , res , async () => {
    try{
      const { key , text , location , radius } = req.query;
      const config = {
         params : {
             query:text,
             key:key,
             location:location,
             radius:radius
         }
       }
      const result = await axios.get(_GOOGLE_TEXTSEARCH_URL,config);
      res.send(result.data);  
      } catch(error) {
        console.log("searchPlace:: error",error);
        res.send(error);
    }
  })
});

/// This is for textsearch google autocomplete api
export const autoCompleteSearch =  functions.https.onRequest( (req , res) => {
  CORS( req , res , async () => {
    try{
      const { key , text , location , radius } = req.query;

      const config = {
        params : {
            input:text,
            key:key,
            location:location,
            radius:radius,
            strictbounds:true
        }
      };
  
      const result = await axios.get(_GOOGLE_AUTOSEARCH_URL,config);
      res.send(result.data);  
    }
    catch(error) {
      res.send(error);
    }
  } );
} );