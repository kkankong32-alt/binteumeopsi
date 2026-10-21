/* 교과서 개념을 바탕으로 새로 작성한 문항. 교과서 그림을 복제하지 않았습니다. */
window.QUIZ = [
 {id:1,type:'OX',title:'둥근 원도 다각형일까요?',prompt:'원은 다각형이다.',options:['O','X'],answer:'X',explanation:'다각형은 선분으로만 둘러싸인 도형이에요. 원의 둘레는 굽은 선이므로 다각형이 아니에요.',source:'수학 134–135쪽 · 수학익힘 82–83쪽',image:'q01.svg',alt:'굽은 선으로 이루어진 원'},
 {id:2,type:'선택형',title:'이 조각의 이름은?',prompt:'그림 속 도형의 이름을 골라 주세요.',options:['사각형','오각형','육각형','팔각형'],answer:'오각형',explanation:'변을 차례로 세면 5개예요. 변이 5개인 다각형은 오각형이라고 해요.',source:'수학 136–137쪽 · 수학익힘 82쪽',image:'q02.svg',alt:'집 모양으로 연결된 다섯 개의 선분'},
 {id:3,type:'단답형',title:'꼭짓점을 찾아요',prompt:'팔각형의 꼭짓점은 몇 개일까요? 숫자로 써 주세요.',answer:'8',accepted:['8','8개','여덟','여덟개'],explanation:'다각형의 변의 수와 꼭짓점의 수는 같아요. 팔각형은 변도 8개, 꼭짓점도 8개예요.',source:'수학 136–137쪽 · 수학익힘 83쪽'},
 {id:4,type:'초성맞추기',title:'곧은 선으로 둘러싸인 친구',prompt:'선분으로만 둘러싸인 도형을 무엇이라고 할까요?',hint:'ㄷ ㄱ ㅎ',answer:'다각형',explanation:'선분으로만 둘러싸인 도형의 이름은 다각형이에요. 삼각형, 사각형, 오각형 등이 있어요.',source:'수학 135쪽, 152쪽 · 수학익힘 82쪽'},
 {id:5,type:'OX',title:'변의 길이만 같으면 될까요?',prompt:'변의 길이가 모두 같은 다각형은 언제나 정다각형이다.',options:['O','X'],answer:'X',explanation:'정다각형은 변의 길이뿐 아니라 각의 크기도 모두 같아야 해요. 정사각형이 아닌 마름모처럼 변은 같아도 각이 서로 다른 도형이 있어요.',source:'수학 138–139쪽 · 수학익힘 84–85쪽'},
 {id:6,type:'선택형',title:'대각선을 찾아요',prompt:'사각형 ㄱㄴㄷㄹ에서 대각선인 선분은 무엇일까요?',options:['ㄱㄴ','ㄴㄷ','ㄱㄷ','ㄷㄹ'],answer:'ㄱㄷ',explanation:'대각선은 서로 이웃하지 않는 두 꼭짓점을 이은 선분이에요. ㄱ과 ㄷ은 이웃하지 않아요. 나머지 보기는 사각형의 변이에요.',source:'수학 140쪽 · 수학익힘 86쪽',image:'q06.svg',alt:'왼쪽 위 ㄱ, 오른쪽 위 ㄴ, 오른쪽 아래 ㄷ, 왼쪽 아래 ㄹ인 사각형'},
 {id:7,type:'순서완성형',title:'작은 수부터 차례차례',prompt:'변의 수가 적은 도형부터 많은 도형 순서로 놓아 주세요.',options:['육각형','삼각형','오각형','사각형'],answer:['삼각형','사각형','오각형','육각형'],explanation:'삼각형의 변은 3개, 사각형은 4개, 오각형은 5개, 육각형은 6개예요. 3 → 4 → 5 → 6 순서로 놓아요.',source:'수학 136쪽, 148쪽'},
 {id:8,type:'초성맞추기',title:'꼭짓점 사이의 지름길',prompt:'다각형에서 서로 이웃하지 않는 두 꼭짓점을 이은 선분의 이름은?',hint:'ㄷ ㄱ ㅅ',answer:'대각선',explanation:'서로 이웃하지 않는 두 꼭짓점을 이은 선분을 대각선이라고 해요. 이웃한 두 꼭짓점을 이으면 변이 돼요.',source:'수학 140쪽, 152쪽 · 수학익힘 86쪽'},
 {id:9,type:'단답형',title:'대각선은 모두 몇 개?',prompt:'사각형에 그을 수 있는 대각선은 모두 몇 개일까요? 숫자로 써 주세요.',answer:'2',accepted:['2','2개','둘','두개'],explanation:'사각형에는 서로 마주 보는 꼭짓점의 쌍이 두 쌍 있어요. 각 쌍을 이으면 대각선은 모두 2개예요. 같은 선을 두 번 세지 않아요.',source:'수학 140–141쪽 · 수학익힘 86–87쪽',image:'q09.svg',alt:'대각선이 아직 그려지지 않은 사각형'},
 {id:10,type:'서술형',title:'정다각형의 비밀 두 가지',prompt:'다각형이 정다각형이 되려면 어떤 두 가지 조건이 필요할까요? 변의 길이와 각의 크기를 모두 넣어 설명해 주세요.',answer:'변의 길이가 모두 같고 각의 크기가 모두 같아야 한다.',explanation:'두 조건이 모두 필요해요. ① 모든 변의 길이가 같아요. ② 모든 각의 크기가 같아요. 한 가지만 같아서는 정다각형이 아니에요. 두 조건을 모두 설명하면 정답으로 인정해요.',source:'수학 138–139쪽 · 수학익힘 84–85쪽'}
];
window.gradeAnswer = function(q,value){
 const norm=s=>String(s||'').normalize('NFKC').replace(/[\s.,!?。]/g,'');
 if(Array.isArray(q.answer))return JSON.stringify(value)===JSON.stringify(q.answer);
 if(q.type!=='서술형')return (q.accepted||[q.answer]).some(a=>norm(a)===norm(value));
 const s=String(value||'').normalize('NFKC').replace(/\s/g,'');
 // 초등 문장 수준의 제한된 규칙 채점. 부정/모순 답은 정답으로 처리하지 않는다.
 if(/않|아니|다르|달라|달라도|없|한가지만|하나만|일부만|변만|각만|또는/.test(s))return false;
 const ending='(?:는|가|도)?(?:모두|전부|서로)?(?:같|똑같|동일)';
 const separate=new RegExp('변(?:의)?길이'+ending).test(s)&&new RegExp('각(?:의)?크기'+ending).test(s);
 const combined=new RegExp('(?:변(?:의)?길이와각(?:의)?크기|각(?:의)?크기와변(?:의)?길이)'+ending).test(s);
 return separate||combined;
};
