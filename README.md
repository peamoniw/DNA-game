# DNA Rush

เกมจับคู่เบส DNA แบบ Web-based Educational Game ที่ผู้เล่นต้องจับคู่เบสที่เข้าคู่กันได้ถูกต้อง เช่น A ↔ T, C ↔ G โดยมีระบบ timer, score, combo, difficulty scaling และ game over screen

## ภาพรวมโปรเจค

DNA Rush เป็นเกมที่ออกแบบให้เล่นง่ายและมีความท้าทายเพิ่มขึ้นอย่างต่อเนื่อง ผู้เล่นต้องจับคู่การ์ด DNA ที่เคลื่อนที่บนสายพานในเวลาที่กำหนด 5 นาที คะแนนจะเพิ่มขึ้นเมื่อจับคู่ถูก และจะลดลง/รีเซ็ต combo เมื่อจับคู่ผิด

## โครงสร้างไฟล์

- [index.html](index.html)  
  ไฟล์หลักสำหรับหน้าเว็บทั้งหมด ประกอบด้วย:
  - Start Screen
  - Game Screen
  - Game Over Screen
  - HUD และ UI ที่แสดง Score, Time, Combo

- [styles.css](styles.css)  
  ไฟล์ CSS สำหรับจัด layout, animation, theme, card design, responsive UI และ visual style ที่ให้ความรู้สึกแบบ medical / educational gaming

- [script.js](script.js)  
  ไฟล์เกมหลักที่มี logic ต่อไปนี้:
  - DNA pairing validation: A ↔ T, T ↔ A, C ↔ G, G ↔ C
  - Timer 5 นาที
  - Dynamic difficulty scaling
  - Spawn และ movement ของการ์ดบน conveyor
  - Click selection และ match checking
  - Score, Combo, Wrong Match, Accuracy
  - Game start / restart / back to menu

## กฎการจับคู่ DNA

- A ↔ T
- T ↔ A
- C ↔ G
- G ↔ C

สรุปว่า pair ถูกจะต้องตรงกับ mapping ที่กำหนดไว้ใน function `isCorrectPair(base1, base2)` ใน [script.js](script.js)

## วิธีรันเกม

### วิธีที่ 1: รันด้วย Python HTTP Server

1. เปิด Terminal ในโฟลเดอร์โปรเจค
2. รันคำสั่งต่อไปนี้:

```bash
cd /workspaces/DNA-game
python3 -m http.server 8000
```

3. เปิดเบราว์เซอร์แล้วไปที่:

```text
http://localhost:8000
```

### วิธีที่ 2: เปิดไฟล์ HTML โดยตรง

สามารถเปิด [index.html](index.html) โดยตรงในเบราว์เซอร์ได้ แต่แนะนำให้ใช้ HTTP server เพื่อให้ behavior ของ browser สม่ำเสมอกว่า

## วิธีเล่น

1. กด START GAME
2. จับคู่การ์ด DNA ที่อยู่บนสายพาน
3. ให้จับคู่ถูกก่อนเวลาหมด
4. สร้าง combo ให้สูงเพื่อเพิ่มคะแนน
5. เมื่อเวลา 00:00 จะเข้าสู่ Game Over Screen และแสดงผลคะแนนสุดท้าย

## ฟีเจอร์หลัก

- Timer 5 นาที
- Dynamic increasing speed ตามเวลา
- Score และ Combo System
- Accurate DNA pairing logic
- Responsive UI สำหรับ Desktop / Tablet / Mobile
- Modern biotech/education visual design

## หมายเหตุ

โปรเจคนี้เป็น static web game ไม่มี backend และสามารถรันได้ทันทีโดยไม่ต้องติดตั้ง package ใด ๆ
