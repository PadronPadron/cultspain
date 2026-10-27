import {InputError,required,text,cents,date} from './accounting';
import {one,stmt,id,now,guardedBatch,auditStmt} from './store';

// Receipts have one source of truth, including payments entered from a completed appointment.
export async function putIncome(key:string|undefined,b:any,actor:string){
 const old=key?await one('SELECT * FROM incomes WHERE id=?',[key]):null;
 if(key&&!old)throw new InputError('No se ha encontrado el ingreso.',404);
 if(old&&b.revision!==old.revision)throw new InputError('El ingreso ha cambiado. Actualiza la página.',409);
 const archive=['archive','restore'].includes(b.action);
 if(archive&&!old)throw new InputError('No se ha encontrado el ingreso.',404);
 const reason=old?required(b.correctionReason,'Motivo de la corrección',1000):'';
 if(old&&b.bookingId!==undefined&&(b.bookingId||null)!==old.booking_id)throw new InputError('No se puede cambiar la cita de un cobro ya registrado.');
 const bookingId=old?.booking_id||(b.bookingId?required(b.bookingId,'Cita',80):null);
 const booking=bookingId?await one('SELECT * FROM bookings WHERE id=?',[bookingId]):null;
 if(bookingId&&(!booking||booking.status!=='completed'))throw new InputError('Solo se puede vincular una cita completada.',409);
 if(booking&&!old&&(booking.paid_cents>0||await one('SELECT id FROM incomes WHERE booking_id=?',[bookingId])))throw new InputError('La cita ya tiene un cobro registrado. Edita o restaura ese ingreso.',409);
 const archived=archive?(b.action==='archive'?1:0):(old?.archived||0);
 let values:any;
 if(archive)values={...old,archived,correction_reason:reason};
 else{
  const amount=cents(b.amountCents);if(!amount)throw new InputError('El importe recibido debe ser mayor que cero.');
  const method=required(b.paymentMethod,'Forma de cobro',30);if(!['cash','card','transfer','other'].includes(method))throw new InputError('Selecciona una forma de cobro válida.');
  const clientId=booking?.client_id||(b.clientId?required(b.clientId,'Cliente',80):null);
  if(clientId){const client=await one('SELECT id,archived FROM clients WHERE id=?',[clientId]);if(!client||client.archived&&old?.client_id!==clientId)throw new InputError('El cliente no existe o está archivado.');}
  values={date:date(b.date),category:required(b.category,'Categoría',100),description:required(b.description,'Concepto',1000),amount_cents:amount,payment_method:method,client_id:clientId,booking_id:bookingId,document_number:text(b.documentNumber,100),notes:text(b.notes,3000),correction_reason:reason,archived};
 }
 const recordId=key||id(),stamp=now();delete values.id;delete values.created_at;delete values.revision;values.updated_at=stamp;
 const fields=Object.keys(values),commands:D1PreparedStatement[]=[];
 if(old)commands.push(stmt(`UPDATE incomes SET ${fields.map(f=>f+'=?').join(',')},revision=revision+1 WHERE id=?`,[...Object.values(values),recordId]));
 else{values.id=recordId;values.created_at=stamp;const cols=Object.keys(values);commands.push(stmt(`INSERT INTO incomes(${cols.join(',')}) VALUES(${cols.map(()=>'?').join(',')})`,Object.values(values)));}
 let condition=old?'EXISTS(SELECT 1 FROM incomes WHERE id=? AND revision=?)':'1=1';const args:unknown[]=old?[recordId,old.revision]:[];
 if(booking){
  const previous=old&&!old.archived?old.amount_cents:0,previousDate=old&&!old.archived?old.date:'';
  condition+=' AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND status=\'completed\' AND paid_cents=? AND paid_date=?)';args.push(bookingId,previous,previousDate);
  const received=archived?0:values.amount_cents,receivedDate=archived?'':values.date;
  commands.push(stmt('UPDATE bookings SET paid_cents=?,paid_date=?,price_cents=CASE WHEN ?>0 THEN ? ELSE price_cents END,price_confirmed=1 WHERE id=?',[received,receivedDate,received,received,bookingId]),auditStmt(actor,'bookings',bookingId,archive?'income_'+b.action:'income_update',{paidCents:booking.paid_cents,paidDate:booking.paid_date},{paidCents:received,paidDate:receivedDate,incomeId:recordId}));
 }
 commands.push(auditStmt(actor,'incomes',recordId,archive?b.action:old?'update':'create',old,values));
 try{await guardedBatch(condition,args,commands)}catch(e){if(String(e).includes('UNIQUE'))throw new InputError('La cita ya tiene un cobro registrado. Actualiza la página.',409);throw e}
 return {id:recordId};
}
