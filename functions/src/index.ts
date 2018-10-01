import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import axios from 'axios';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

const _GOOGLE_TEXTSEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const _GOOGLE_AUTOSEARCH_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";

const CORS = require('cors')({origin:true});

//// userid , 
//// city : { id , name , thumbnailUrl, location:{lat:'',lng:''}}
//// place : {id , name ,rating , thumbnailUrl , location:{lat:'',lng:''}}};
//// 
export const addBookmarkPlace = functions.https.onRequest(async (req,res) => {
    try
    {
      const {userid , city , place}  = req.body;
      
      const cityDocRef = db.collection('users')
                            .doc(userid)
                            .collection('cities')
                            .doc(city.id);

      const cityRef = await cityDocRef.get();

      !cityRef.exists && await cityDocRef.set(city);
      
      await cityDocRef.collection('places')
                          .doc(place.id)
                          .set(place);
      res.send(200);
    }catch(error) {
      res.send(error);
    }
});

//// userid ,cityId, placeId
export const removeBookmarkPlace = functions.https.onRequest( async (req,res) => {
    try
    {
        const { userid , cityid , placeid } = req.body;
        const cityDocRef = db.collection("users")
                              .doc(userid)
                              .collection('cities')
                              .doc(cityid);

        const placeDocRef = cityDocRef
                              .collection('places')
                              .doc(placeid);

        const placeRef = await placeDocRef.get();

        if(placeRef.exists){
          await placeDocRef.delete();
          const placesRef = await cityDocRef.collection('places').get();
          placesRef.empty && await cityDocRef.delete();
        }
        res.send(200);
    }
    catch(error) {
      res.send(error);
    }
});

export const getBookmarks = functions.https.onRequest( async (req , res) => {
  try{
      const userid = req.query.userid;
      const citiesRef = await db.collection('users').doc(userid).collection('cities').get();
      const cities = [];
      citiesRef.forEach(city => {
          cities.push(city.data());
      });
      res.send(cities);
  }catch(error) {
    res.send(error);
  }
} );

export const getBookmarkPlaces = functions.https.onRequest( async (req , res) => {
  try{
      const userid = req.query.userid;
      const cityid = req.query.cityid;

      const placesRef = await db.collection('users')
                                .doc(userid)
                                .collection('cities')
                                .doc(cityid)
                                .collection('places').get();
      const places = [];
      placesRef.forEach(place => {
        places.push(place.data());
      });
      res.send(places);
  }catch(error) {
    res.send(error);
  }
} );

/// This is for textsearch google places api
export  const searchPlace = functions.https.onRequest( (req,res) => {
  CORS( req , res , async () => {
    try{
      const query = req.query;

      const config = {
           params : {
              ...query
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


