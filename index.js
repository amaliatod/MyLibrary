import express from "express";
import bodyParser from "body-parser";
import pg from "pg";


const app = express();
const port = 3000;

//configuram baza de date
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "",
  password: "",
  port: 5432,
});
db.connect();

//activează un middleware care parsează datele trimise prin formulare HTML
//Când trimiți un formular body-parser-ul extrage datele din corpul cererii și le pune în req.body
app.use(bodyParser.urlencoded({ extended: true }));

//folosit ca browser ul sa aiba acces la fisierele statice
app.use(express.static("public"));


//functia pentru a gasi coperta unei carti folosind api ul
//functia primeste index ul (unei carti), si un obiect care cu proprietatea
//.rows generaza o lista de carti
async function getCover(index, data) {
  //titlu cartii cautate
  const titlu = data.rows[index].titlu;
  //construim url ul pentru API ul folosit
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
    titlu
  )}`;

  //facem o cerere HTTP catre url ul creat
  const response = await fetch(url);
  //asteptam raspunsul si il extragem in format JSON
  //acesta este initial de tip Response dar il transformam intr un obiect JavaScript
  const response_json = await response.json();
  //raspunsul contine o lista(docs); luam prima carte din ea
  const book_cover = response_json.docs[0];

  //daca raspunsul e valid si imaginea copertii are un id vali
  if (book_cover && book_cover.cover_i) {
    //construim url ul copertii folosind API ul
    let cover =
      "https://covers.openlibrary.org/b/id/" + book_cover.cover_i + "-L.jpg";
    //adaugam coperta ca proprietate pentru fiecare carte
    data.rows[index] = {
      ...data.rows[index],
      coperta: cover,
    };
  }

  return data.rows;
}

//pagina ordonata dupa nume 
app.get("/orderedbyname", async (req, res) => {
  const data = await db.query(
    "SELECT id, titlu, rating, descriere FROM books ORDER BY titlu ASC"
  );

  for (let i = 0; i < data.rows.length; i++) {
    await getCover(i, data);
  }

  res.render("index.ejs", { books: data.rows, activepage : "library" });
});

//pagina ordonata dupa rating
app.get("/orderedbyrating", async (req, res) => {
  const data = await db.query(
    "SELECT id, titlu, rating, descriere FROM books ORDER BY rating ASC"
  );

  for (let i = 0; i < data.rows.length; i++) {
    await getCover(i, data);
  }

  res.render("index.ejs", { books: data.rows, activepage : "library" });
});

//pagina principala
app.get("/", async (req, res) => {
  const data = await db.query("SELECT id, titlu, rating, descriere FROM books");

  for (let i = 0; i < data.rows.length; i++) {
    await getCover(i, data);
  }

  res.render("index.ejs", { books: data.rows, activepage : "library" });
});

//pagina de edit
app.get("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const data = await db.query(
    "SELECT id, titlu, rating, descriere FROM books WHERE id=$1",
    [id]
  );

  res.render("edit.ejs", { books: data.rows[0], activepage : "edit" });
});


//pagina de adaugare 
app.get("/add", (req, res) => {
  res.render("add.ejs", {activepage : "add"});

});

//pagina de vizualizare
app.get("/view/:id", async (req, res) => {
  const id = req.params.id;
  const data = await db.query(
    "SELECT id, titlu, rating, descriere FROM books WHERE id=$1",
    [id]
  );


  await getCover(0, data);
  res.render("view.ejs", { books: data.rows[0], activepage : "view" });
});

//ruta de trimitere a datelor cartii noi si de adaugare in db
app.post("/add", async (req, res) => {
  const titlu = req.body.InputTitle;
  const descriere = req.body.InputDescription;
  const rating = req.body.InputRating;

  await db.query("INSERT INTO books (titlu,descriere,rating) VALUES ($1,$2,$3)", [titlu,descriere,rating]);
  res.redirect("/");

});

////ruta de trimitere a datelor editate ale cartii si de adaugare in db
app.post("/edit/:id", async (req, res) => {
  // params --> retine doar valori din URL (/edit/:id)
  const id = req.params.id;

  //body --> retine valorile din formularul trimis catre URL
  const title = req.body.InputTitle;
  const description = req.body.InputDescription;
  const rating = req.body.InputRating;

  console.log(description);

  await db.query("UPDATE books SET titlu = $1, descriere = $2, rating = $3 WHERE id = $4", [title,description,rating,id]);
  res.redirect("/");
}); 

//stergere
app.post("/delete/:id", async (req, res) => {
  const id = req.params.id;

  await db.query("DELETE FROM books WHERE id = $1", [id]);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
