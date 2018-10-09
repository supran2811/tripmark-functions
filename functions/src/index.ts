import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import axios from 'axios';

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();

const _GOOGLE_TEXTSEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const _GOOGLE_AUTOSEARCH_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const _GOOGLE_PLACEDETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";

const CORS = require('cors')({origin:true});

//// userid , 
//// city : { place_id , name , thumbnailUrl, location:{lat:'',lng:''}}
//// place : {place_id , name ,rating , thumbnailUrl , location:{lat:'',lng:''}}};
//// 
export const addBookmarkPlace = functions.https.onRequest(async (req,res) => {
    try
    {
      const {userid , city , place}  = req.body;
      
      const cityDocRef = db.collection('users')
                            .doc(userid)
                            .collection('cities')
                            .doc(city['place_id']);

      let cityRef = await cityDocRef.get();

      !cityRef.exists && await cityDocRef.set(city);
      
      await cityDocRef.collection('places')
                          .doc(place['place_id'])
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
        const { userid , cityid , placeid } = req.query;
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
      let cities = {};
      citiesRef.forEach(city => {
          const cityData = city.data();
          cities = { ...cities , [cityData.place_id]:cityData }
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

      const places = await _getBookmarkedPlacesInCity(userid,cityid);

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


////This is to check if place id already bookmarked
export const isPlaceBookmarked = functions.https.onRequest( async (req,res) => {
  try{
    const { userid , cityid , placeid } = req.query;
    const isMarked = await _isPlaceBookmarked( userid , cityid , placeid);
    res.send(isMarked);
  }catch(error) {
    res.send(error);
  }
  
});

//// This is for getting details of place using google api
export const getPlaceDetails = functions.https.onRequest ( (req,res) => {
  CORS(req , res , async () => {
    try{
      const { key , placeid , cityid , userid } = req.query;
      const config = {
        params : {
          key,
          placeid
        }
      };
      const result = await axios.get(_GOOGLE_PLACEDETAILS_URL,config);
      let isMarked = false;
      if(userid && cityid) {
        isMarked = await _isPlaceBookmarked( userid , cityid , placeid);
      }

      const finalResult = {...result.data , bookmarked:isMarked};
      
      res.send(finalResult);
    }catch(error) {
      res.send(error);
    }
  })
});

//// This is for getting details of city along with list of bookmarks using google api
export const getCityDetails = functions.https.onRequest ( (req,res) => {
  CORS(req , res , async () => {
    try{
      const { key ,cityid , userid } = req.query;
      const config = {
        params : {
          key,
          placeid:cityid,
          fields:"name,geometry,photos,place_id"
        }
      };
      const result = await axios.get(_GOOGLE_PLACEDETAILS_URL,config);
      const places = await _getBookmarkedPlacesInCity(userid,cityid);
      const finalResult = { ...result.data , places:places};
      res.send(finalResult);
    }catch(error) {
      res.send(error);
    }
  })
});


const _getBookmarkedPlacesInCity = async function(userid,cityid) {
  if(userid && cityid) {
      const placesRef = await db.collection('users')
                                .doc(userid)
                                .collection('cities')
                                .doc(cityid)
                                .collection('places').get();
      let places = {};
      placesRef.forEach(place => {
         const placeData = place.data();
         places = { ...places , [placeData.place_id] : placeData }
      });
      return places;
  }
  return null;
}

/// This is a provate function to check is place is bookmarked
const _isPlaceBookmarked = async function(userid , cityid , placeid) {
  if(userid && userid !== '' && 
                cityid  && cityid !== '' && 
                placeid && placeid !== '') {
    const cityDocRef = db.collection("users")
    .doc(userid)
    .collection('cities')
    .doc(cityid);
  
    const placeDocRef = cityDocRef
    .collection('places')
    .doc(placeid);
  
    const placeRef = await placeDocRef.get();
  
    return placeRef.exists;
  }
  return false;
  
}
