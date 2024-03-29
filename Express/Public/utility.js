var client;

async function connectionEstablishment() {
    const { MongoClient, Collection } = require('mongodb');

    const url = 'mongodb://127.0.0.1:27017';
    client = new MongoClient(url);
    
    await client.connect();
    console.log("Connected to server");
}


function closeClient() {
    client.close();
}


function compareDates(date1, date2) {
    // format yyyy-mm-dd
    // params: referenceDate, dbDate
    // check if dbDate is greater than or equal to reference date
    referenceDate = date1.split("-");   // from user
    dbDate = date2.split("-");          // from database

    if (parseInt(dbDate[0]) < parseInt(referenceDate[0])) return false;
    if (parseInt(dbDate[0]) > parseInt(referenceDate[0])) return true;
    
    if (parseInt(dbDate[1]) < parseInt(referenceDate[1])) return false;
    if (parseInt(dbDate[1]) > parseInt(referenceDate[1])) return true;
    
    if (parseInt(dbDate[2]) < parseInt(referenceDate[2])) return false;
    if (parseInt(dbDate[2]) > parseInt(referenceDate[2])) return true;
    return true;
}


async function addUser (username, email, password) {
    connectionEstablishment();

    const dbName = 'library';
    const db = client.db(dbName);
    const userDetails = db.collection("UserInfo");
    
    var user = { username: username, email: email, password: hashPassword(password) };
    await userDetails.insertOne(user);

    closeClient();
}


async function loginUser(username, password) {
    connectionEstablishment();

    const dbName = 'library';
    const db = client.db(dbName);
    const userDetails = db.collection("UserInfo");

    const result = await userDetails.find({ username: username }).toArray();
    // console.log(result)
    closeClient();
    if (result.length==0) {  
        return false;
    } else {
        return comparePassword(password, result[0].password);
    }
}


async function fetchData(article_type, search_field, search_value) {
    connectionEstablishment();

    const dbName = 'library';
    const db = client.db(dbName);
    var collection;
    var query;
    var result = [];


    if (article_type == "article_book") 
        collection = db.collection("books");
    else if (article_type == "article_journal") 
        collection = db.collection("journals");


    if (search_field == "article_name") {
        query = { name: { $regex: new RegExp(search_value, "i") } }

        var tempRes = await collection.find(query).toArray();
        for (let i in tempRes) {
            result.push(tempRes[i])
        }           
    } else if (search_field == "article_date") {
        var tempRes = await collection.find().toArray();

        for (let i in tempRes) 
            if (compareDates(search_value, tempRes[i].publicDate)) {
                result.push(tempRes[i])
            }
    }
    
    closeClient();
    return result
}


async function generateReport() {
    connectionEstablishment()

    const dbName = 'library';
    const db = client.db(dbName);
    var collection;
    var tempRes;
    var result = [];

    collection = db.collection("books");
    // tempRes = await collection.find().toArray();
    tempRes=await collection.aggregate([
        {
          $lookup: {
            from: "authors",
            localField: "author_id",
            foreignField: "author_id",
            as: "authors"
          }
          
        },
        {
            $unwind: {
              path: "$authors",
              preserveNullAndEmptyArrays: true
            }
        }
      ]).toArray();
     console.log(tempRes) 
    for (let i in tempRes) 
        result.push(tempRes[i])

    collection = db.collection("journals");
    // tempRes = await collection.find().toArray();
    tempRes=await collection.aggregate([
        {
          $lookup: {
            from: "authors",
            localField: "author_id",
            foreignField: "author_id",
            as: "authors"
          }
          
        },
        {
            $unwind: {
              path: "$authors",
              preserveNullAndEmptyArrays: true
            }
        }
      ]).toArray();
    for (let i in tempRes) 
        result.push(tempRes[i])

    closeClient();
    return result
}


function hashPassword(plaintextPassword) {
    const bcrypt = require("bcrypt")
    var saltRounds = 10;
    const hash = bcrypt.hashSync(plaintextPassword, saltRounds);
    return hash;
}


// compare password
function comparePassword(plaintextPassword, hash) {
    const bcrypt = require("bcrypt")
    return bcrypt.compareSync(plaintextPassword, hash);
}


async function editData(article_type, id, name, publicDate, author_id) {
    // id and article_type is necessary; author_id, publicDate and name can be edited
    // if id not found, inserted as new record
    connectionEstablishment();

    const dbName = 'library';
    const db = client.db(dbName);
    var collection;

    if (article_type == "article_book") 
        collection = db.collection("books");
    else if (article_type == "article_journal") 
        collection = db.collection("journals");

    var filter = { id: id };
    var update = { $set: { name: name, publicDate: publicDate, author_id: author_id } };

    await collection.updateOne(filter, update, { upsert: true });

    closeClient();
}


function outputBeautify (value) {
    let returnValue = "<html><head><title>Query Result</title></head> <body><table cellspacing='10'>";
    returnValue += "<tr><th>ID</th> <th>Name</th> <th>Publication Date</th> <th>Author ID</th></tr>"

    // var i = 0
    for (let i in value) {
        returnValue += "<tr><td>" + value[i].id + "</td><td>" + value[i].name + "</td><td>" + value[i].publicDate + "</td><td>" + value[i].author_id +"</td></tr>" 
    }
    returnValue += "</table></body></html>"

    return returnValue
}
function reportBeautify (value){
    let returnValue = "<html><head><title>Query Result</title></head> <body><table cellspacing='10'>";
    returnValue += "<tr><th>ID</th> <th>Name</th> <th>Publication Date</th> <th>Author ID</th><th>Author Name</th></tr>"

    // var i = 0
    for (let i in value) {
        returnValue += "<tr><td>" + value[i].id + "</td><td>" + value[i].name + "</td><td>" + value[i].publicDate + "</td><td>" + value[i].author_id + "</td><td>" + value[i].authors.author_name +  "</td></tr>" 
    }
    returnValue += "</table></body></html>"

    return returnValue
}



module.exports = { fetchData, addUser, loginUser, generateReport, editData, outputBeautify,reportBeautify }
// try fuzzy search
