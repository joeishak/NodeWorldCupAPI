/**Node Packages - Declaration / Instantiation */
let express = require('express');
let router = express.Router();
let request = require('request');
let config = require('../configuration/config');
let sqlInstance = require('mssql');
let db = require('../configuration/db');

const pool = new sqlInstance.ConnectionPool(config)
 
pool.connect(err => {
    // ...
})
/**
 * 
 * GLOBAL ROUTE for footballapi.js
 * http://localhost:8010/extract/footballapi/ . . .
 */

let customVisualizationDataSQL = `Select  s.comp_group , e.type , count(e.type) 'Total'
From dbo.events e , dbo.football_teams t, dbo.standings s
WHERE e.teamid = t.id
AND t.id = s.team_id
group by s.comp_group,e.type
order by 1`;

/**Route Global Variables */
function executeQuery(query,res) {

    const request = new sqlInstance.Request(pool)

    request.query(query, function (err, result) {
        if (err) {
            console.log(err);
            throw err;
        }

        console.log(result);
        data = result.recordset;
        res.send( result);      
    }); 
}
// localhost/extract/footballapi/
// Default FootBALL API REQUESTS FOR DATA
router.use((req, res, next) => {

    console.log("Welcome to the Extra/Footballapi Route");

    next();
});
// Update Standings
router.post('/standings', (req, res, next) => {

    let date = new Date();
    console.log('Recieved a post for Standings, listing content: '+ date.toLocaleTimeString() );
    console.log(req.body.length);
    // console.log(sqlInstance);
    let Standings = req.body;
    let StandingUpdateSql = "";
    for (let i = 0; i < Standings.length; i++) {

        let standing = Standings[i];
        StandingUpdateSql += `Update dbo.standings
        set position = ${standing.position},overall_gp =  ${standing.overall_gp},
        overall_w = ${standing.overall_w},overall_gs  = ${standing.overall_gs},
        points =  ${standing.points},overall_l = ${standing.overall_l}
        where team_name like  '%${standing.team_name}%'; `
    }
    // res.send(StandingUpdateSql);
    //  responseSql += StandingUpdateSql;

     executeQuery(StandingUpdateSql,res);

    /** Method One 
     sqlInstance.connect(config, err => {
        if (err) console.log(err);
        console.log('Connected!');
        let request = new sqlInstance.Request();
        request.query(StandingUpdateSql, function (err, recordset) {
            if (err) console.log(err)
            res.status(200).send({ Success: "Sucess",Query: StandingUpdateSql, Data: recordset });
        });
        sqlInstance.close();
        });
   */
});
//Update Squads
router.post('/Teams', (req, res, next) => {

    let SquadInsertSql = "";
    let SquadUpdateSql = "";
    let Teams = req.body;
    console.log('We received Teams Data:');
    console.log(Teams.length);

    // For Each of the Teams
    for (let i = 0; i < Teams.length; i++) {

        let team = Teams[i];
        console.log(team)
        // And each squad of that team
        for (let j = 0; j < team.squad.length; j++) {

            let player = Teams[i].squad[j];
            player.teamId = Teams[i].team_id;
            player.number = (player.number == '') ? 0 : player.number;
            player.injured = (player.injured == "False") ? 0 : 1;
            player.name = player.name.replace("'", "");
            SquadInsertSql += `
            Insert into dbo.squads 
            Values(${player.id},'${player.name}',${player.number},'${player.position}',
            ${player.injured},${player.minutes},${player.lineups},${player.appearences},
            ${player.goals},${player.assists},${player.yellowcards},${player.yellowred},${player.redcards},${player.teamId}); `
            SquadUpdateSql += `
            Update dbo.squads set 
            injured = ${player.injured}, minutes = ${player.minutes},
            lineups = ${player.lineups}, appearances = ${player.appearences},
            goals = ${player.goals}, assists = ${player.assists},
            yellowcards = ${player.yellowcards}, yellowreds = ${player.yellowred},
            redcards =${player.redcards} where id = ${player.id}; `
        }
    }

    executeQuery(SquadUpdateSql,res);
    
});

// Filter Matches
router.post('/matches', (req, res, next) => {

    let Matches = req.body;
    let MatchUpdateSql = "";
    let EventInsertSql = "";
    let MatchInsertSql = "";
    let sqlStatement = "";

    console.log('We recieved Match Data: ');
    console.log(Matches.length);
    Matches.forEach(match => {


        ///format date
        let formattedDate = match.formatted_date.split('.')[2] +
            "-" + match.formatted_date.split('.')[1] + "-" +
            match.formatted_date.split('.')[0];
        ///format ht and full time score [0-0] = 
        let matchId = match.id;
        let timer, status = "";
        let homeScore, awayScore = 0;
        let city = match.venue_city;
        if (city == "Kazan'") {
            city = 'Kazan'
        }
        //  check for null
        if (match.timer == '') {
            // console.log('Time is null');
            timer = "Not Started";
            status = "Not Started";
            homeScore = 0;
            awayScore = 0;
        } else {
            timer = match.timer;
            status = match.status;

        }
         if(match.localteam_score == "?"){
             console.log('Found it');
             match.localteam_score = 0;
             console.log(match.localteam_score);
         }
         if(match.visitorteam_score == "?"){
            console.log('Found it');
            match.visitorteam_score = 0;
            console.log(match.visitorteam_score)
        }


        MatchInsertSql += ` Insert into dbo.football_matches (apiMatchID, competitionID,dateOfMatch, 
            season,venue,status,time , homeTeamID,awayteamid,homescore,awayscore) Values 
            (${match.id}, ${match.comp_id}, '${formattedDate}', '${match.season}' ,
            '${match.venue_id}', '${match.status}', '${match.time}', ${match.localteam_id},
            ${match.visitorteam_id}, ${match.localteam_score}, ${match.visitorteam_score});`;
        MatchUpdateSql += `Update dbo.football_matches set status = '${match.status}', time =  '${match.time}', homeTeamId = ${match.localteam_id},
            awayTeamId = ${match.visitorteam_id}, homeScore = ${match.localteam_score}, 
            awayScore = ${match.visitorteam_score} where apiMatchId = ${match.id};`
            match.events.forEach(event => {
                switch (event.team) {
                    case 'localteam':
                        teamID = match.localteam_id;
                        break;
                    case 'visitorteam':
                        teamID = match.visitorteam_id;
                        break;
                    default:
                        break;
                }

                event.player = event.player.replace("'", "");
                if(event.player == ''){
                    event.player = 'null'
                }
             
                if(event.player_id!=''){
                    EventInsertSql +=
                    `Insert into dbo.events (matchid,teamid,playerId, playername,type)` +
                    `Values (${match.id},${teamID},${event.player_id},'${event.player}','${event.type}'); `;
                }
                else {
                    EventInsertSql +=
                    `Insert into dbo.events (matchid,teamid,playername,type)` +
                    `Values (${match.id},${teamID},'${event.player}','${event.type}'); `;
                }
                
                // sqlUpdateStatement += 
                // `
                // Update  dbo.events  set matchid = ${match.id},teamid = ${teamID},type = '${event.type}' where id =${event.id};`;
            });
    })//End For Each 
    sqlStatement = MatchInsertSql + EventInsertSql;
//    res.send({query: sqlStatement});
    executeQuery(sqlStatement,res);
    
});




//Select Statement to show how to use the MSSQL Package
router.get('/', (req, res, next) => {

    console.log('Attemping to connect to DB');
    // var sql = require("mssql");
    // // config for your database
    // var config = {
    //     user: 'sa',
    //     password: 'mypassword',
    //     server: 'localhost', 
    //     database: 'SchoolDB' 
    // };

    // connect to your database
    // sqlInstance.connect(config, function (err) {

    //     if (err) console.log(err);

    //     console.log('Connected!');
    //     // create Request object
    //     let request = new sqlInstance.Request();

    //     // query to the database and get the records
    //     request.query(customVisualizationDataSQL, function (err, recordset) {

    //         if (err) console.log(err)

    //         // send records as a response
    //         res.send(recordset);

    //     });
    // });

    
 
});
// GENERATE UPDATES FOR STANDINGS
router.get('/standings', (req, res, next) => {
    console.log("Accessing the update standings route");
    request('http://api.football-api.com/2.0/standings/1056?Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c', (err, results) => {
        let data = JSON.parse(results.body);
        // console.log(standing);

        let SQL = "";
        // let match = data[i];
        for (let i = 0; i < data.length; i++) {
            let standing = data[i];
            // console.log(standing);
            SQL += ` update dbo.standings
                set position = ${standing.position},
                overall_gp =  ${standing.overall_gp},
                overall_w = ${standing.overall_w},
                overall_gs  = ${standing.overall_gs},
                points =  ${standing.points},
                overall_l = ${standing.overall_l}
                where team_name like  '%${standing.team_name}%';`
        }
        // for( let i = 0; )
        res.send(SQL);
    });
});
// GENERATE UPDATES FOR MATCHES
router.get('/match', (req, res, next) => {

    request('http://api.football-api.com/2.0/matches?comp_id=1056&from_date=1.1.2018&to_date=1.8.2018&Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c', (err, results) => {
        let data = JSON.parse(results.body);
        let sql = "";
        data.forEach(match => {
            sql +=
                `Update dbo.football_matches
                                status = '${match.status}', 
                                timer = '${match.timer}',
                                time =  '${match.time}',
                                homeTeamId = ${match.localteam_id},
                                awayTeamId = ${match.visitorteam_id}, 
                                homeScore = ${match.localteam_score}, 
                                awayScore = ${match.visitorteam_score}
                            where apiMatchId = ${match.id},`

        })//End For Each
        res.send(sql);
    });//End Request
});
//GENERATE UPDATES FOR EVENTS
router.get('/events', (req, res, next) => {

    request('http://api.football-api.com/2.0/matches?comp_id=1056&from_date=1.1.2018&to_date=1.8.2018&Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c', (err, results) => {
        let data = JSON.parse(results.body);
        let sql = "";
        let teamID = 0;
        data.forEach(match => {
            match.events.forEach(event => {
                switch (event.team) {
                    case 'localteam':
                        teamID = match.localteam_id;
                        break;
                    case 'visitorteam':
                        teamID = match.visitorteam_id;
                        break;
                    default:
                        break;
                }
                sql +=
                    `Insert into dbo.events (matchid,teamid,type)` +
                    `Values (${match.id},${teamID},'${event.type}'); \n`;

            });
        })


        res.send(sql);


    })//End For Each
});
router.get('/update-matches', (req, res, next) => {

    console.log("Accessing the update match route");
    request('http://api.football-api.com/2.0/matches?comp_id=1056&from_date=1.1.2018&to_date=1.8.2018&Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c', (err, results) => {
        let data = JSON.parse(results.body);
        console.log(results.body);

        let SQL = data.map((match) => {

            // let match = data[i];

            let EventsSql = [];
            if (match.events != []) {
                console.log(match.events);
                EventsSql = match.events.map((event) => {
                    let pID = event.player_id;
                    let teamID = "";
                    if (pID == "") {
                        pID = null;
                    }
                    console.log(event.team);
                    switch (event.team) {
                        case 'localteam':
                            teamID = match.localteam_id;
                            break;
                        case 'visitorteam':
                            teamID = match.visitorteam_id;
                            break;
                        default:
                            break;
                    }

                    return `Insert into dbo.events Values` +
                        `(${event.id},${match.id},${teamID},'${event.type}');`;
                })
            }//End If
            let formattedDate = match.formatted_date.split('.')[2] + "-" + match.formatted_date.split('.')[1] + "-" + match.formatted_date.split('.')[0];

            return {
                matchSql: `Update dbo.football_matches
                            set apiMatchId = ${match.id},
                            dateOfMatch = '${formattedDate}',
                            season =  '${match.season}',
                            week = '${match.week}',
                            status = '${match.status}', 
                            timer = '${match.timer}',
                            time =  '${match.time}',
                            homeTeamId = ${match.localteam_id},
                            awayTeamId = ${match.visitorteam_id}, 
                            homeScore = ${match.localteam_score}, 
                            awayScore = ${match.visitorteam_score}
                        where apiMatchId = ${match.id}; `,
                eventsSql: EventsSql
            }


        });

        res.send(SQL);
    });
});
//Matches/
router.get('/extract-match', (req, res, next) => {
    console.log("Extracting Matches and Events");
    var dateObj = new Date();
    var month = dateObj.getUTCMonth() + 1; //months from 1-12
    var day = dateObj.getUTCDate() - 1;
    var year = dateObj.getUTCFullYear();

    newdate = `${day}.${month}.${year}`;

    // Handles Matches And Events
    request('http://api.football-api.com/2.0/matches?comp_id=1056&from_date=1.1.2018&to_date=1.8.2018&Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c', (err, results) => {
        console.log("Match Results"); console.log(JSON.parse(results.body));
        //  Generate SQL FOR MATCHES AND EVENTS
        let SQL = JSON.parse(results.body).map((match) => {
            let EventsSql = [];
            if (match.events != []) {
                EventsSql = match.events.map((event) => {
                    let pID = event.player_id;
                    if (pID == "") {
                        pID = null;
                    }
                    return `Insert into dbo.events Values` +
                        `(${event.id},${match.id},${pID},'${event.player}','${event.type}');`;
                })
            }//End If
            ///format date
            let formattedDate = match.formatted_date.split('.')[2] + "-" + match.formatted_date.split('.')[1] + "-" + match.formatted_date.split('.')[0];
            ///format ht and full time score [0-0] = 
            let matchId = match.id;
            let timer, status = "";
            let homeScore, awayScore = 0;

            if (match.timer == "") {
                // console.log('Time is null');
                timer = "Not Started";
                status = "Not Started";
                homeScore = 0;
                awayScore = 0;
            } else {
                timer = match.timer;
                status = match.status;
            }
            return {
                MatchSql: "Insert into dbo.football_matches Values(" +
                    `${match.id}, ${match.comp_id}, '${formattedDate}', '${match.season}' ,'${match.week}',` +
                    `'${match.venue_city}', '${status}', '${timer}', '${match.time}', ${match.localteam_id},` +
                    `${match.visitorteam_id}, ${homeScore}, ${awayScore}, '${match.localteam_name}' , '${match.visitorteam_name}');`,
                EventsSql: EventsSql
            }
        });//End  Results Body Map for Match SQL Generation



        // let count = 0;
        // Try Adding all the new SQL To the DAtabase
        SQL.map(MatchEvent => {
            // console.log(`Match number ${count}`);
            let matchSql = MatchEvent.MatchSql;
            let events = MatchEvent.EventsSql; //array
            // Uncomment when ready to retry running all together.            
            //Query for Insert MAtches
            console.log("Match Sql"); console.log(matchSql);

            sqlInstance.connect(config, err => {
                // ... error checks
                // Query
                new sqlInstance.Request().query(matchSql, (err, result) => {
                    if (err) throw err;
                    else {
                        new sqlInstance.Request().query("Select * from dbo.football_api_matches;", (err, result2) => {
                            res.send(result2);
                        })
                    }

                })

                // Stored Procedure
            })
            sqlInstance.on('error', err => {
                // ... error handler
            })
            sqlInstance.close();


            if (events != []) {
                events.map(eventSql => {
                    // Uncomment when ready to retry running all together.     
                    console.log("Event Sql"); console.log(eventSql);

                    sqlInstance.connect(config, err => {
                        // ... error checks
                        // Query
                        new sqlInstance.Request().query(eventSql, (err, result) => {
                            if (err) throw err;
                            else {
                                new sqlInstance.Request().query("Select * from dbo.events;", (err, result2) => {
                                    res.send(result2);
                                })
                            }

                        })

                        // Stored Procedure
                    })
                    sqlInstance.on('error', err => {
                        // ... error handler
                    })
                    sqlInstance.close();

                    // con.query(eventSql, function (err, result) {
                    //     if (err) {
                    //         console.log(`Error occured while adding Match Events To Database:` + err);
                    //         throw err;
                    //         }
                    //     console.log('Success adding Match Events') ;
                    //     console.log(result);
                    //     });//End Query Con
                });//End Events Map Sql Generations
            }
        });//End Sql Map for  Events
    });//End Football API REquest
});
router.get('/extract-match-mssql', (req, res, next) => {
    console.log("Extracting Matches and Events");
    var dateObj = new Date();
    var month = dateObj.getUTCMonth() + 1; //months from 1-12
    var day = dateObj.getUTCDate() - 1;
    var year = dateObj.getUTCFullYear();

    newdate = `${day}.${month}.${year}`;

    // Handles Matches And Events
    request('http://api.football-api.com/2.0/matches?comp_id=1056&from_date=1.1.2018&to_date=1.8.2018&Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c', (err, results) => {
        // console.log("Match Results"); console.log(JSON.parse(results.body));
        //  Generate SQL FOR MATCHES AND EVENTS
        let data = JSON.parse(results.body);
        let eventSql1 = 'Insert into dbo.events (id,matchid,playerid,playerName,type) Values '
        let matchSql1 = 'Insert into dbo.football_matches (apiMatchID, competitionID,dateOfMatch, ' +
            'season,week,venue,status,timer,time,homeTeamID,awayteamid,homescore,awayscore) Values ';
        for (let i = 0; i < data.length; i++) {
            let match = data[i];
            let team = "";

            if (match.events != []) {
                for (let a = 0; a < match.events.length; a++) {
                    let event = match.events[i];
                    let pID = event.player_id;
                    if (pID == "") {
                        pID = null;
                    }

                    if (event.team == "visitorteam") {
                        team = match.visitorteam_id;
                    } else {
                        team = match.localteam_id;
                    }
                    if (i == match.events.length - 1) {
                        eventSql1 += `(${event.id},${match.id},${pID},'${event.player}','${event.type}');`;
                    } else {

                        eventSql1 += `(${event.id},${match.id},${pID},'${event.player}','${event.type}'),`;
                    }
                }
            }//End If


            ///format date
            let formattedDate = match.formatted_date.split('.')[2] + "-" + match.formatted_date.split('.')[1] + "-" + match.formatted_date.split('.')[0];
            ///format ht and full time score [0-0] = 
            let matchId = match.id;
            let timer, status = "";
            let homeScore, awayScore = 0;

            let city = match.venue_city;
            if (city == "Kazan'") {
                city = 'Kazan'
            }
            //  check for null
            if (match.timer == "") {
                // console.log('Time is null');
                timer = "Not Started";
                status = "Not Started";
                homeScore = 0;
                awayScore = 0;
            } else {
                timer = match.timer;
                status = match.status;
            }
            if (i == data.length - 1) {
                matchSql1 += `(${match.id}, ${match.comp_id}, '${formattedDate}', '${match.season}' ,'${match.week}',` +
                    `'${match.venue_id}', '${match.status}', '${match.timer}', '${match.time}', ${match.localteam_id},` +
                    `${match.visitorteam_id}, ${homeScore}, ${awayScore});`;
            }
            else {
                matchSql1 += `(${match.id}, ${match.comp_id}, '${formattedDate}', '${match.season}' ,'${match.week}',` +
                    `'${match.venue_id}', '${match.status}', '${match.timer}', '${match.time}', ${match.localteam_id},` +
                    `${match.visitorteam_id}, ${homeScore}, ${awayScore}),`;
            }
        }


        // let sqlStatement = sqlStatement1 + values;
        res.send(matchSql1);
        // sqlInstance.connect(config, err => {
        //     // ... error checks
        //     // Query
        //     new sqlInstance.Request().query(matchSql1, (err, result) => {

        //     });
        //     new sqlInstance.Request().query("Select * from dbo.football_matches;",(err,result)=>{
        //         res.send(result);
        //      });

        //     // Stored Procedure
        // })
        // sqlInstance.on('error', err => {
        //     throw err
        // })

        // let SQL = JSON.parse(results.body).map((match)=>{
        //             let EventsSql = [];
        //             if(match.events!=[]) {
        //                 EventsSql = match.events.map((event)=>{
        //                     let pID = event.player_id;
        //                     if(pID == "") { 
        //                         pID = null;
        //                     }
        //                     return  +
        //                             `(${event.id},${match.id},${pID},'${event.player}','${event.type}');`;
        //                 })
        //             }//End If
        //     return { MatchSql : "Insert into dbo.football_matches Values(" +
        //     `${match.id}, ${match.comp_id}, '${formattedDate}', '${match.season}' ,'${match.week}',` +
        //     `'${match.venue_city}', '${status}', '${timer}', '${match.time}', ${match.localteam_id},`+
        //     `${match.visitorteam_id}, ${homeScore}, ${awayScore}, '${match.localteam_name}' , '${match.visitorteam_name}');`,
        //     EventsSql: EventsSql }
        // });//End  Results Body Map for Match SQL Generation



        // // let count = 0;
        // // Try Adding all the new SQL To the DAtabase
        // SQL.map(MatchEvent =>{
        //     // console.log(`Match number ${count}`);
        //     let matchSql = MatchEvent.MatchSql;
        //     let events = MatchEvent.EventsSql; //array
        //     // Uncomment when ready to retry running all together.            
        //     //Query for Insert MAtches
        //     console.log("Match Sql"); console.log(matchSql);

        //     sqlInstance.connect(config, err => {
        //         // ... error checks
        //         // Query
        //         new sqlInstance.Request().query(matchSql, (err, result) => {
        //             if(err) throw err;
        //             else{
        //                 new sqlInstance.Request().query("Select * from dbo.football_api_matches;",(err,result2)=>{
        //                     res.send(result2);
        //                 })
        //             }

        //         })

        //         // Stored Procedure
        //     })
        //     sqlInstance.on('error', err => {
        //         // ... error handler
        //     })
        //     sqlInstance.close();


        //     if(events!=[]){
        //         events.map(eventSql=>{
        //             // Uncomment when ready to retry running all together.     
        //             console.log("Event Sql"); console.log(eventSql);

        //             sqlInstance.connect(config, err => {
        //                 // ... error checks
        //                 // Query
        //                 new sqlInstance.Request().query(eventSql, (err, result) => {
        //                     if(err) throw err;
        //                     else{
        //                         new sqlInstance.Request().query("Select * from dbo.events;",(err,result2)=>{
        //                             res.send(result2);
        //                         })
        //                     }

        //                 })

        //                 // Stored Procedure
        //             })
        //             sqlInstance.on('error', err => {
        //                 // ... error handler
        //             })
        //             sqlInstance.close();

        //             // con.query(eventSql, function (err, result) {
        //             //     if (err) {
        //             //         console.log(`Error occured while adding Match Events To Database:` + err);
        //             //         throw err;
        //             //         }
        //             //     console.log('Success adding Match Events') ;
        //             //     console.log(result);
        //             //     });//End Query Con
        //             });//End Events Map Sql Generations
        //         }
        //     });//End Sql Map for  Events
    });//End Football API REquest
});
router.get('/extract', (req, res, next) => {
    console.log("Extracting Teams");
    let teamARR = ['5886', '6135', '6737', '7084', '8117', '8182',
        '8243', '8671', '8878', '8981', '9815', '10245',
        '11262', '11442', '12124', '12303', '12909', '13094',
        '13584', '13849', '13898', '13953', '14227', '14778',
        '14987', '15132', '15152', '15622', '16400', '16598', '16913', '17412'];
    // for each Distinct Team
    teamARR.forEach((team) => {
        //Request their team data One JSON Object
        console.log('Player Id'); console.log(team);
        request(`http://api.football-api.com/2.0/team/${team}?Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c`, (err, results) => {

            console.log(results);
            if (results != undefined) {
                console.log("Team Results"); console.log(JSON.parse(results.body));

                //Parse the results body  
                let response = JSON.parse(results.body);
                // Uncomment when ready to retry running all together.            
                let sql = "Insert into footballdb.teams Values (" +
                    `${response.team_id},${response.is_national},"${response.name}","${response.country}","${response.venue_name}",${response.venue_id},"${response.venue_address}","${response.coach_name}");\n`;
                // Con Query for Inserting the TEams
                console.log("Player SQL"); console.log(sql);
                sqlInstance.connect(config, err => {
                    // ... error checks
                    // Query
                    new sqlInstance.Request().query(sql, (err, result) => {
                        if (err) throw err;
                        else {
                            new sqlInstance.Request().query("Select * from dbo.events;", (err, result2) => {
                                res.send(result2);
                            })
                        }

                    })

                    // Stored Procedure
                })
                sqlInstance.on('error', err => {
                    // ... error handler
                })
                sqlInstance.close();

                // response.squad.map(squad=>{

                //     request(`http://api.football-api.com/2.0/player/${squad.id}?Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c`,(err,results)=>{
                //         console.log("Player Results"); console.log(results);

                //         let player = JSON.parse(results.body);
                //         console.log("Player Results"); console.log(player);
                //         let totalPreviousMinutes = 0 ;
                //         let derived = {};
                //         // for(i = 0; i< player.player_statistics.national.length;i++){
                //         //     let thisStat = player.player_statistics.national[i];
                //         //     if(thisStat.league==="World Cup") {
                //         //         derived = {
                //         //             totalPreviousMinutes: thisStat.minutes+derived.totalPreviousMinutes,
                //         //             appearances: thisStat.appearances+derived.appearances,
                //         //             lineups: thisStat.lineups+derived.lineups,
                //         //             goals: thisStat.goals+derived.goals,
                //         //             yellows: thisStat.yellows+derived.yellows,
                //         //             yellowReds:thisStat.yellowreds+derived.yellowreds,
                //         //             red: thisStat.reds+derived.red
                //         //             };
                //         //     }//end if
                //         //     console.log("Printing Derived");
                //         //     console.log(derived);

                //         // }//end for

                //     });
                // }); 
            }//End if 

        });
    });
});
router.get('/react-data', (req, res, next) => {
    res.send('Preparing your data');
});
router.get('/extract-teams-mssql', (req, res, next) => {
    console.log("Extracting Teams");
    let teamARR = ['9815'];


    for (let i = 0; i < teamARR.length; i++) {
        let sql = "Insert into worldcup.dbo.football_teams(id,name,country,venuename,venueid,venueAddress,coach) Values ("

        let team = teamARR[i];
        request(`http://api.football-api.com/2.0/team/${team}?Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c`, (err, results) => {

            console.log('Neq Request Recieved');
            // console.log("Team Results"); console.log(JSON.parse(results.body));

            //Parse the results body  
            let response = JSON.parse(results.body);
            // Uncomment when ready to retry running all together.   
            console.log('Creating Sql')
            sql += `${response.team_id},'${response.name}','${response.country}','${response.venue_name}',${response.venue_id},'${response.venue_address}','${response.coach_name}');\n`;

            console.log(sql);
            const sqlInstance1 = require('mssql');
            log('Creting SQL INstances')
            // config for your database
            var config1 = {
                server: '192.168.1.12',
                database: 'WorldCup',
                user: 'sa',
                password: 'Infosol123!',
                port: 1433,
                pool: {
                    max: 100,
                    min: 0
                }
            };
            sqlInstance1.connect(config1, err => {
                if (err) {
                    console.log('Sql Instane Error')
                } else {
                    console.log('Connected to DAtabase')
                }

                sqlInstance1.on('error', err => {
                    console.log('Execute Query Error')
                    console.log(err);
                    throw err;
                });

                // Query
                new sqlInstance1.Request().query(sql, (err, result) => {
                    if (err) {
                        console.log('Execute Query Error')
                        console.log(err);
                        throw err;
                    }
                    console.log(result);
                    sqlInstance1.close();
                }) //End New Sql Instance Request
            });


        });//End Request
    }//End For


});
let runSql = (sql) => {
    sqlInstance.connect(config, err => {
        if (err) {
            console.log('Sql Instane Error')
        }
        // Query
        new sqlInstance.Request().query(sql, (err, result) => {
            if (err) {
                console.log('Execute Query Error')
                consle.log(err);
                throw err;
            }


        })
        sqlInstance.on('error', err => {
            console.log('Execute Query Error')
            log(err);
            throw err;
            sqlInstance.close();
        });
        // Stored Procedure
    });


}
let log = (val) => {
    console.log(val);
}
// router.get('/standings',(req,res,next)=>{
//    console.log("Acessing updates for Standings");
//    console.log(Standings);

//     let values = "";
//     let sqlStatement1="";

//         for(let i = 0; i< Standings.length; i++){
//              sqlStatement1+= "INSERT INTO dbo.STANDINGS (comp_id, season, round, stage_id,"+
//             "comp_group, country, team_id, team_name, status, recent_form, position," +
//             "overall_gp, overall_w, overall_d, overall_l, overall_gs, overall_ga,gd,points) Values"
//             let recentForm = "";

//             let s = Standings[i];
//             if(s.recent_form == ""){
//                 recentForm = 'null'
//             }

//             console.log(s);
//                 sqlStatement1 += `('${s.comp_id}','${s.season}', '${s.round}', '${s.stage_id}',
//                         '${s.comp_group}','${s.country}',${ s.team_id},
//                         '${s.team_name}','${s.status}','${recentForm}',
//                         ${s.position},${s.overall_gp},${ s.overall_w},
//                         ${s.overall_d},${ s.overall_l},${ s.overall_gs},
//                         ${ s.overall_ga},'${ s.gd}',${ s.points} );`;



//         }


//         res.send(sqlStatement1)


// });      
module.exports = router;





