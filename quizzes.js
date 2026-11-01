/* Ready-to-play quizzes. correct holds option indexes; order lists items in the right order. */
window.ZQ_TEMPLATES = [
{id:'world',title:'World Explorer',emoji:'🌍',desc:'Geography for everyone',qs:[
 {type:'quiz',text:'Which is the longest river system in Asia?',emoji:'🏞️',options:['Ganges','Yangtze','Mekong','Indus'],correct:[1],time:20},
 {type:'tf',text:'Dhaka is the capital of Bangladesh.',emoji:'🇧🇩',options:['True','False'],correct:[0],time:10},
 {type:'multi',text:'Which of these are oceans?',options:['Pacific','Sahara','Indian','Alps'],correct:[0,2],time:25},
 {type:'slider',text:'How many continents are there on the usual model?',min:1,max:10,answer:7,tolerance:0,time:15},
 {type:'type',text:'Which country has the city of Paris as its capital?',accept:['France'],time:20},
 {type:'order',text:'Put these from smallest to largest by area',order:['Bangladesh','India','Russia'],time:25},
 {type:'poll',text:'Where would you travel first?',options:['Mountains','Beach','City','Forest'],time:15},
 {type:'cloud',text:'One word for your favourite place',time:20}]},
{id:'science',title:'Science Sparks',emoji:'🧪',desc:'Quick science facts',qs:[
 {type:'quiz',text:'What gas do plants take in for photosynthesis?',options:['Oxygen','Carbon dioxide','Nitrogen','Helium'],correct:[1],time:20,points:2},
 {type:'tf',text:'Sound travels faster than light.',options:['True','False'],correct:[1],time:10},
 {type:'quiz',text:'What is the chemical symbol for water?',emoji:'💧',options:['H2O','CO2','O2','NaCl'],correct:[0],time:15},
 {type:'slider',text:'At sea level, water boils at how many °C?',min:50,max:150,answer:100,tolerance:2,time:15},
 {type:'multi',text:'Which of these are planets?',options:['Mars','Sun','Venus','Moon'],correct:[0,2],time:25},
 {type:'type',text:'Which planet is known as the Red Planet?',accept:['Mars'],time:20}]},
{id:'un',title:'UN in 6 Questions',emoji:'🕊️',desc:'From the ZyeemZia courses',qs:[
 {type:'quiz',text:'In what year was the UN Charter signed?',options:['1919','1945','1948','1960'],correct:[1],time:20},
 {type:'slider',text:'How many permanent members does the Security Council have?',min:1,max:15,answer:5,tolerance:0,time:15},
 {type:'tf',text:'The International Court of Justice sits in The Hague.',options:['True','False'],correct:[0],time:12},
 {type:'multi',text:'Which are permanent members of the Security Council?',options:['China','Germany','France','Japan'],correct:[0,2],time:25},
 {type:'quiz',text:'Which article of the Charter covers self-defence?',options:['Article 2(4)','Article 25','Article 51','Article 103'],correct:[2],time:20,points:2},
 {type:'order',text:'Put in date order',order:['UN Charter','Universal Declaration of Human Rights','Rome Statute of the ICC'],time:25}]},
{id:'bn',title:'বাংলা কুইজ',emoji:'🇧🇩',desc:'বাংলাদেশ ও সাধারণ জ্ঞান',qs:[
 {type:'quiz',text:'বাংলাদেশের জাতীয় ফুল কোনটি?',options:['গোলাপ','শাপলা','জবা','বেলি'],correct:[1],time:15},
 {type:'tf',text:'পদ্মা সেতু বাংলাদেশে অবস্থিত।',options:['সত্য','মিথ্যা'],correct:[0],time:10},
 {type:'quiz',text:'আন্তর্জাতিক মাতৃভাষা দিবস কবে?',options:['২৬ মার্চ','১৬ ডিসেম্বর','২১ ফেব্রুয়ারি','১৪ এপ্রিল'],correct:[2],time:15},
 {type:'poll',text:'আপনার প্রিয় ঋতু কোনটি?',options:['গ্রীষ্ম','বর্ষা','শরৎ','শীত'],time:15}]}
];
