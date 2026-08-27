const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('DSA_LinkedLists.pdf'));

doc.fontSize(24).text('SUBJECT: Data Structures and Algorithms', { align: 'center' });
doc.fontSize(20).text('1. Introduction', { underline: true });
doc.fontSize(12).text('A linked list is a linear data structure, in which the elements are not stored at contiguous memory locations. The elements in a linked list are linked using pointers.');
doc.moveDown();

doc.fontSize(20).text('2. Node Structure', { underline: true });
doc.fontSize(12).text('A linked list consists of nodes where each node contains a data field and a reference(link) to the next node in the list.');
doc.moveDown();
doc.font('Courier').text('class Node {\n  int data;\n  Node next;\n}');
doc.font('Helvetica').moveDown();

doc.fontSize(20).text('3. Completing Insertion', { underline: true });
doc.fontSize(12).text('To insert a node at the beginning, time complexity is O(1). To insert at the end, it takes O(N). Insertion is faster than arrays because no shifting is required.');
doc.moveDown();

doc.fontSize(20).text('4. Example Code', { underline: true });
doc.font('Courier').text('function insertAtBeginning(head, data) {\n  let newNode = new Node(data);\n  newNode.next = head;\n  return newNode;\n}');

doc.end();
console.log("PDF created: DSA_LinkedLists.pdf");
