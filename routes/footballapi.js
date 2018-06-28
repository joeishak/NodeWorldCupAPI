let express = require('express');
let router = express.Router();
let request = require('request');
// let Standings = require('./standings.js');
let config = require('../configuration/config');
// localhost/extract/footballapi/
// Default FootBALL API REQUESTS FOR DATA

router.use((req,res,next)=>{

   console.log("elcome to the Extra/Footballapi Route");
   next();
});
router.post('/',(req,res,next)=>{
    res.send(req.body);
})
router.get('/',(req,res,next)=>{
 
 
    var sql = require("mssql");

    // // config for your database
    // var config = {
    //     user: 'sa',
    //     password: 'mypassword',
    //     server: 'localhost', 
    //     database: 'SchoolDB' 
    // };

    // connect to your database
    sql.connect(config, function (err) {
    
        if (err) console.log(err);

        // create Request object
        let request = new sql.Request();
           
        // query to the database and get the records
        request.query(`Select  s.comp_group , e.type , count(e.type)
        From dbo.events e , dbo.football_teams t, dbo.standings s
        WHERE e.teamid = t.id
        AND t.id = s.team_id
        group by s.comp_group,e.type
      order by 1`, function (err, recordset) {
            
            if (err) console.log(err)

            // send records as a response
            res.send(recordset[0]);
            
        });
    });
    sql.close();
});

// GENERATE UPDATES FOR STANDINGS
router.get('/standings',(req,res,next)=>{
    console.log("Accessing the update standings route");
    request('http://api.football-api.com/2.0/standings/1056?Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c',(err,results)=>{
        let data = JSON.parse(results.body);
        // console.log(standing);

        let SQL = "";
            // let match = data[i];
            for(let i = 0; i<data.length;i++){
                let standing = data[i];
                // console.log(standing);
                SQL +=  ` update dbo.standings
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
router.get('/match',(req,res,next)=>{

    request('http://api.football-api.com/2.0/matches?comp_id=1056&from_date=1.1.2018&to_date=1.8.2018&Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c',(err,results)=>{
        let data = JSON.parse(results.body);
        let sql = "";
        data.forEach(match=>{
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
router.get('/events',(req,res,next)=>{

    request('http://api.football-api.com/2.0/matches?comp_id=1056&from_date=1.1.2018&to_date=1.8.2018&Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c',(err,results)=>{
        let data = JSON.parse(results.body);
        let sql = "";
        let teamID = 0;
        data.forEach(match=>{
            match.events.forEach(event=>{
                switch(event.team){
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
})




router.get('/update-matches',(req,res,next)=>{

    console.log("Accessing the update match route");
    request('http://api.football-api.com/2.0/matches?comp_id=1056&from_date=1.1.2018&to_date=1.8.2018&Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c',(err,results)=>{
        let data = JSON.parse(results.body);
        console.log(results.body);

        let SQL = data.map((match)=>{
            
            // let match = data[i];

            let EventsSql = [];
            if(match.events!=[]) {
                console.log(match.events);
                EventsSql = match.events.map((event)=>{
                    let pID =event.player_id;
                    let teamID = "";
                    if(pID == "") { 
                        pID = null;
                    }
                    console.log(event.team);
                    switch(event.team){
                        case 'localteam':
                            teamID = match.localteam_id;
                        break;
                        case 'visitorteam':
                            teamID = match.visitorteam_id;
                        break;
                        default:
                        break;
                    }
                    
                    return  `Insert into dbo.events Values` +
                            `(${event.id},${match.id},${teamID},'${event.type}');`;
                })
            }//End If
            let formattedDate = match.formatted_date.split('.')[2] +"-" +match.formatted_date.split('.')[1] +"-" + match.formatted_date.split('.')[0] ;
            
            return{ matchSql : `Update dbo.football_matches
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
                         eventsSql: EventsSql}
                            
            
        });

        res.send(SQL);
    });
});
//Matches/
router.get('/extract-match',(req,res,next)=>{
    console.log("Extracting Matches and Events");
    var dateObj = new Date();
    var month = dateObj.getUTCMonth() + 1; //months from 1-12
    var day = dateObj.getUTCDate() -1;
    var year = dateObj.getUTCFullYear();
    
    newdate =`${day}.${month}.${year}`;

    // Handles Matches And Events
    request('http://api.football-api.com/2.0/matches?comp_id=1056&from_date=1.1.2018&to_date=1.8.2018&Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c',(err,results)=>{
        console.log("Match Results"); console.log(JSON.parse(results.body));
      //  Generate SQL FOR MATCHES AND EVENTS
        let SQL = JSON.parse(results.body).map((match)=>{
                    let EventsSql = [];
                    if(match.events!=[]) {
                        EventsSql = match.events.map((event)=>{
                            let pID = event.player_id;
                            if(pID == "") { 
                                pID = null;
                            }
                            return  `Insert into dbo.events Values` +
                                    `(${event.id},${match.id},${pID},'${event.player}','${event.type}');`;
                        })
                    }//End If
            ///format date
            let formattedDate = match.formatted_date.split('.')[2] +"-" +match.formatted_date.split('.')[1] +"-" + match.formatted_date.split('.')[0] ;
            ///format ht and full time score [0-0] = 
            let matchId = match.id;
            let timer,status  = "";
            let homeScore, awayScore = 0;

            if(match.timer == ""){
                // console.log('Time is null');
                timer = "Not Started";
                status = "Not Started";
                homeScore = 0;
                awayScore =0;
                } else {
                    timer = match.timer;
                    status = match.status;
                    }
            return { MatchSql : "Insert into dbo.football_matches Values(" +
            `${match.id}, ${match.comp_id}, '${formattedDate}', '${match.season}' ,'${match.week}',` +
            `'${match.venue_city}', '${status}', '${timer}', '${match.time}', ${match.localteam_id},`+
            `${match.visitorteam_id}, ${homeScore}, ${awayScore}, '${match.localteam_name}' , '${match.visitorteam_name}');`,
            EventsSql: EventsSql }
        });//End  Results Body Map for Match SQL Generation
    
       
       
        // let count = 0;
        // Try Adding all the new SQL To the DAtabase
        SQL.map(MatchEvent =>{
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
                    if(err) throw err;
                    else{
                        new sqlInstance.Request().query("Select * from dbo.football_api_matches;",(err,result2)=>{
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
             

            if(events!=[]){
                events.map(eventSql=>{
                    // Uncomment when ready to retry running all together.     
                    console.log("Event Sql"); console.log(eventSql);
                    
                    sqlInstance.connect(config, err => {
                        // ... error checks
                        // Query
                        new sqlInstance.Request().query(eventSql, (err, result) => {
                            if(err) throw err;
                            else{
                                new sqlInstance.Request().query("Select * from dbo.events;",(err,result2)=>{
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
router.get('/extract-match-mssql',(req,res,next)=>{
    console.log("Extracting Matches and Events");
    var dateObj = new Date();
    var month = dateObj.getUTCMonth() + 1; //months from 1-12
    var day = dateObj.getUTCDate() -1;
    var year = dateObj.getUTCFullYear();
    
    newdate =`${day}.${month}.${year}`;

    // Handles Matches And Events
    request('http://api.football-api.com/2.0/matches?comp_id=1056&from_date=1.1.2018&to_date=1.8.2018&Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c',(err,results)=>{
        // console.log("Match Results"); console.log(JSON.parse(results.body));
      //  Generate SQL FOR MATCHES AND EVENTS
      let data = JSON.parse(results.body);
      let eventSql1 = 'Insert into dbo.events (id,matchid,playerid,playerName,type) Values '
      let matchSql1 = 'Insert into dbo.football_matches (apiMatchID, competitionID,dateOfMatch, '+
                      'season,week,venue,status,timer,time,homeTeamID,awayteamid,homescore,awayscore) Values ';
        for (let i = 0;i<data.length;i++){
            let match = data[i];
            let team ="";
   
            if(match.events!=[]) {
                for(let a = 0; a< match.events.length;a++){
                    let event = match.events[i];
                    let pID = event.player_id;
                    if(pID == "") { 
                        pID = null;
                    }

                    if(event.team=="visitorteam"){
                        team = match.visitorteam_id;
                    } else{
                        team = match.localteam_id;
                    }
                    if(i == match.events.length-1){
                        eventSql1 +=`(${event.id},${match.id},${pID},'${event.player}','${event.type}');`;
                    }else {

                        eventSql1 +=`(${event.id},${match.id},${pID},'${event.player}','${event.type}'),`;
                    }
                }
            }//End If


             ///format date
             let formattedDate = match.formatted_date.split('.')[2] +"-" +match.formatted_date.split('.')[1] +"-" + match.formatted_date.split('.')[0] ;
             ///format ht and full time score [0-0] = 
             let matchId = match.id;
             let timer,status  = "";
             let homeScore, awayScore = 0;
 
             let city = match.venue_city;
             if(city=="Kazan'")
             {
                city='Kazan'
             }
            //  check for null
             if(match.timer == ""){
                 // console.log('Time is null');
                 timer = "Not Started";
                 status = "Not Started";
                 homeScore = 0;
                 awayScore =0;
             } else {
                     timer = match.timer;
                     status = match.status;
             }
             if(i==data.length-1){
                matchSql1+= `(${match.id}, ${match.comp_id}, '${formattedDate}', '${match.season}' ,'${match.week}',` +
                `'${match.venue_id}', '${match.status}', '${match.timer}', '${match.time}', ${match.localteam_id},`+
                `${match.visitorteam_id}, ${homeScore}, ${awayScore});`;
             }
             else{
                matchSql1+= `(${match.id}, ${match.comp_id}, '${formattedDate}', '${match.season}' ,'${match.week}',` +
                `'${match.venue_id}', '${match.status}', '${match.timer}', '${match.time}', ${match.localteam_id},`+
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

router.get('/extract',(req,res,next)=>{
    console.log("Extracting Teams");
    let teamARR = ['5886','6135','6737','7084','8117','8182',
                    '8243','8671','8878','8981','9815','10245',
                    '11262','11442','12124','12303','12909','13094',
                    '13584','13849','13898','13953','14227','14778',
                    '14987','15132','15152','15622','16400','16598','16913','17412'];
    // for each Distinct Team
    teamARR.forEach((team) => {
        //Request their team data One JSON Object
        console.log('Player Id'); console.log(team);
        request(`http://api.football-api.com/2.0/team/${team}?Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c`,(err,results)=>{
            
            console.log(results);
            if(results != undefined)  {
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
                    if(err) throw err;
                    else{
                        new sqlInstance.Request().query("Select * from dbo.events;",(err,result2)=>{
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
router.get('/react-data',(req,res,next)=>{
    res.send('Preparing your data');
});
router.get('/extract-teams-mssql',(req,res,next)=>{
    console.log("Extracting Teams");
    let teamARR = [ '9815'];


    for(let i =0; i< teamARR.length;i++){
        let sql = "Insert into worldcup.dbo.football_teams(id,name,country,venuename,venueid,venueAddress,coach) Values (" 

        let team = teamARR[i];
        request(`http://api.football-api.com/2.0/team/${team}?Authorization=565ec012251f932ea4000001061fbec3b0f34d714a33b597c0415d4c`,(err,results)=>{

            console.log('Neq Request Recieved');
            // console.log("Team Results"); console.log(JSON.parse(results.body));
            
            //Parse the results body  
            let response = JSON.parse(results.body);
            // Uncomment when ready to retry running all together.   
            console.log('Creating Sql') 
            sql +=`${response.team_id},'${response.name}','${response.country}','${response.venue_name}',${response.venue_id},'${response.venue_address}','${response.coach_name}');\n`;

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
                pool:{
                    max: 100,
                    min:0
                }
                };
                sqlInstance1.connect(config1, err => {
                    if(err){
                        console.log('Sql Instane Error')
                    }else{
                        console.log('Connected to DAtabase')
                    }
                   
                    sqlInstance1.on('error', err => {
                        console.log( 'Execute Query Error')
                        console.log(err);
                        throw err;
                    });
                    
                      // Query
                 new sqlInstance1.Request().query(sql, (err, result) => {
                    if(err){
                        console.log( 'Execute Query Error')
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
let runSql = (sql) =>{
    sqlInstance.connect(config, err => {
        if(err){
            console.log('Sql Instane Error')
        }
        // Query
        new sqlInstance.Request().query(sql, (err, result) => {
            if(err){
                console.log( 'Execute Query Error')
                consle.log(err);
                throw err;
            } 
            
     
        })
        sqlInstance.on('error', err => {
            console.log( 'Execute Query Error')
            log(err);
            throw err;
            sqlInstance.close();
        });
        // Stored Procedure
    });
   
   
}

let log = (val) =>{
    console.log(val);
}

router.get('/standings',(req,res,next)=>{
   console.log("Acessing updates for Standings");
   console.log(Standings);
   
    let values = "";
    let sqlStatement1="";

        for(let i = 0; i< Standings.length; i++){
             sqlStatement1+= "INSERT INTO dbo.STANDINGS (comp_id, season, round, stage_id,"+
            "comp_group, country, team_id, team_name, status, recent_form, position," +
            "overall_gp, overall_w, overall_d, overall_l, overall_gs, overall_ga,gd,points) Values"
            let recentForm = "";
          
            let s = Standings[i];
            if(s.recent_form == ""){
                recentForm = 'null'
            }
            
            console.log(s);
                sqlStatement1 += `('${s.comp_id}','${s.season}', '${s.round}', '${s.stage_id}',
                        '${s.comp_group}','${s.country}',${ s.team_id},
                        '${s.team_name}','${s.status}','${recentForm}',
                        ${s.position},${s.overall_gp},${ s.overall_w},
                        ${s.overall_d},${ s.overall_l},${ s.overall_gs},
                        ${ s.overall_ga},'${ s.gd}',${ s.points} );`;
            
            

        }


        res.send(sqlStatement1)
        
         
    });
           
        
module.exports = router;



        

