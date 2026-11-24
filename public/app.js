const $ = (id) => document.getElementById(id);
let config = { paymentConfigured: false, advancePercent: 20, rooms: [] };
const priceMap = { "room-1":2000, "room-2":2000, "room-3":2000, "room-4":2000 };
const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
$("checkIn").min = today.toISOString().slice(0,10);
$("checkOut").min = $("checkIn").min;
$("year").textContent = new Date().getFullYear();

fetch("/api/config").then(r=>r.json()).then(data=>{config=data; updateEstimate();}).catch(()=>{});
$("checkIn").addEventListener("change",()=>{ $("checkOut").min=$("checkIn").value; updateEstimate(); });
$("checkOut").addEventListener("change",updateEstimate);
$("roomId").addEventListener("change",updateEstimate);
document.querySelectorAll(".choose-room").forEach(btn=>btn.addEventListener("click",()=>{
  $("roomId").value=btn.dataset.room; $("booking").scrollIntoView({behavior:"smooth"}); updateEstimate();
}));
function nightsCount(){
  const a = new Date($("checkIn").value), b = new Date($("checkOut").value);
  return $("checkIn").value && $("checkOut").value && b>a ? Math.ceil((b-a)/86400000) : 0;
}
function updateEstimate(){
  const room=$("roomId").value, nights=nightsCount(), price=priceMap[room]||0;
  if(!room || !nights){ $("estimate").textContent="Select a room and valid dates to see your estimate."; return; }
  const total=price*nights, advance=Math.round(total*(config.advancePercent||30)/100);
  $("estimate").innerHTML=`<div>${nights} night(s) × ₹${price.toLocaleString("en-IN")} / night</div><div>Estimated total <strong>₹${total.toLocaleString("en-IN")}</strong></div><div>Advance (${config.advancePercent||30}%) <strong>₹${advance.toLocaleString("en-IN")}</strong></div>`;
}
function message(text){$("status").textContent=text;}
$("bookingForm").addEventListener("submit",async e=>{
  e.preventDefault(); message("");
  if(!nightsCount()){message("Please choose a valid check-in and check-out date.");return;}
  if(!config.paymentConfigured){message("The website preview is ready, but online payments are not activated yet. Add your Razorpay account keys to the server .env file before accepting bookings.");return;}
  const payload={
    roomId:$("roomId").value,checkIn:$("checkIn").value,checkOut:$("checkOut").value,
    guestName:$("guestName").value.trim(),email:$("email").value.trim(),
    phone:$("phone").value.trim(),guests:$("guests").value
  };
  const button=document.querySelector(".pay-button");button.disabled=true;button.textContent="Checking availability…";
  try{
    const availability=await fetch("/api/availability",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}).then(r=>r.json());
    if(!availability.available)throw new Error("Sorry, this room is already booked for those dates. Please choose another date or room.");
    const orderResponse=await fetch("/api/create-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const order=await orderResponse.json();if(!orderResponse.ok)throw new Error(order.error||"Unable to create payment order.");
    const checkout=new Razorpay({
      key:order.keyId,amount:order.amount,currency:order.currency,name:order.name,
      description:order.description,order_id:order.orderId,
      prefill:{name:payload.guestName,email:payload.email,contact:payload.phone},
      theme:{color:"#29392e"},
      handler:async response=>{
        try{
          const verify=await fetch("/api/verify-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(response)});
          const result=await verify.json();if(!verify.ok)throw new Error(result.error||"Payment verification failed.");
          $("bookingForm").reset();updateEstimate();
          message(`Booking confirmed! Thank you, ${result.booking.guestName}. Your ${result.booking.roomName} reservation is confirmed. Advance paid: ₹${result.booking.advance.toLocaleString("en-IN")}.`);
        }catch(err){message(err.message);}
      }
    });
    checkout.on("payment.failed",r=>message(r.error?.description||"Payment did not complete. Please try again."));
    checkout.open();
  }catch(err){message(err.message);}
  finally{button.disabled=false;button.innerHTML='Continue to secure payment <span>→</span>';}
});
