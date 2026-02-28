export interface MemberBalance {
	userId: string;
	name: string;
	totalIncome: number;
	totalExpenses: number;
	remainder: number;
}

export interface Transfer {
	from: string;
	fromName: string;
	to: string;
	toName: string;
	amount: number;
}

export function calculateEqualRemainder(members: MemberBalance[]): Transfer[] {
	if (members.length === 0) return [];

	const totalRemainder = members.reduce((sum, member) => sum + member.remainder, 0);
	const targetPerPerson = Math.round(totalRemainder / members.length);

	const deltas = members.map((member) => ({
		...member,
		delta: member.remainder - targetPerPerson
	}));

	const payers = deltas.filter((delta) => delta.delta > 0).sort((a, b) => b.delta - a.delta);
	const receivers = deltas.filter((delta) => delta.delta < 0).sort((a, b) => a.delta - b.delta);

	const transfers: Transfer[] = [];
	let payerIndex = 0;
	let receiverIndex = 0;

	while (payerIndex < payers.length && receiverIndex < receivers.length) {
		const amount = Math.min(payers[payerIndex].delta, -receivers[receiverIndex].delta);
		if (amount > 0) {
			transfers.push({
				from: payers[payerIndex].userId,
				fromName: payers[payerIndex].name,
				to: receivers[receiverIndex].userId,
				toName: receivers[receiverIndex].name,
				amount
			});
		}

		payers[payerIndex].delta -= amount;
		receivers[receiverIndex].delta += amount;

		if (payers[payerIndex].delta === 0) payerIndex += 1;
		if (receivers[receiverIndex].delta === 0) receiverIndex += 1;
	}

	return transfers;
}

export function calculateProportional(members: MemberBalance[]): Transfer[] {
	const totalIncome = members.reduce((sum, member) => sum + member.totalIncome, 0);
	const totalExpenses = members.reduce((sum, member) => sum + member.totalExpenses, 0);

	if (totalIncome === 0) return [];

	const withAdjustments = members.map((member) => {
		const incomeRatio = member.totalIncome / totalIncome;
		const fairExpenseShare = Math.round(totalExpenses * incomeRatio);
		const adjustment = fairExpenseShare - member.totalExpenses;
		return { ...member, adjustment };
	});

	const payers = withAdjustments.filter((member) => member.adjustment > 0).sort((a, b) => b.adjustment - a.adjustment);
	const receivers = withAdjustments
		.filter((member) => member.adjustment < 0)
		.sort((a, b) => a.adjustment - b.adjustment);

	const transfers: Transfer[] = [];
	let payerIndex = 0;
	let receiverIndex = 0;

	while (payerIndex < payers.length && receiverIndex < receivers.length) {
		const amount = Math.min(payers[payerIndex].adjustment, -receivers[receiverIndex].adjustment);
		if (amount > 0) {
			transfers.push({
				from: payers[payerIndex].userId,
				fromName: payers[payerIndex].name,
				to: receivers[receiverIndex].userId,
				toName: receivers[receiverIndex].name,
				amount
			});
		}

		payers[payerIndex].adjustment -= amount;
		receivers[receiverIndex].adjustment += amount;

		if (payers[payerIndex].adjustment === 0) payerIndex += 1;
		if (receivers[receiverIndex].adjustment === 0) receiverIndex += 1;
	}

	return transfers;
}
