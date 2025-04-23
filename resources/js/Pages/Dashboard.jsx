import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Simple CountUp animation component
const CountUpAnimation = ({ end, duration = 1000, decimals = 0, prefix = '', suffix = '' }) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const frameRef = useRef(0);
    const startTimeRef = useRef(0);
    
    useEffect(() => {
        // Reset when end value changes
        countRef.current = 0;
        setCount(0);
        startTimeRef.current = Date.now();

        const animate = () => {
            const now = Date.now();
            const progress = Math.min(1, (now - startTimeRef.current) / duration);
            
            if (progress < 1) {
                countRef.current = progress * end;
                setCount(countRef.current);
                frameRef.current = requestAnimationFrame(animate);
            } else {
                setCount(end);
            }
        };
        
        frameRef.current = requestAnimationFrame(animate);
        
        return () => cancelAnimationFrame(frameRef.current);
    }, [end, duration]);
    
    // Format the number with commas and decimals
    const formatNumber = (num) => {
        if (decimals === 0) {
            return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        } else {
            const power = Math.pow(10, decimals);
            const fixed = Math.floor(num * power) / power;
            const [whole, decimal] = fixed.toString().split('.');
            const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            return `${formattedWhole}${decimal ? ',' + decimal.padEnd(decimals, '0') : ',00'}`;
        }
    };
    
    return (
        <span>{prefix}{formatNumber(count)}{suffix}</span>
    );
};

export default function Dashboard() {
	const { auth } = usePage().props;

	// State for statistics
	const [anafStats, setAnafStats] = useState({ recentSearches: [], searchCount: 0 });
	const [seapStats, setSeapStats] = useState({ 
        totalSumLastMonth: '0,00', 
        period: 'N/A',
        transactionCount: 0,
        asNumber: 0 // Store numeric value for animation
    });
	const [loadingStats, setLoadingStats] = useState(true);
	const [lastRefreshed, setLastRefreshed] = useState(new Date());
	const [animationTrigger, setAnimationTrigger] = useState(0); // Trigger for re-animation

	// Function to fetch stats
	const fetchStats = async () => {
		// Only set loading if not already loading to avoid flicker on refetch
		setLoadingStats(prev => !prev ? true : prev);
		try {
			// Ensure routes exist before calling them
			const anafRouteExists = typeof route === 'function' && route().has('dashboard.stats.anaf');
			const seapRouteExists = typeof route === 'function' && route().has('dashboard.stats.seap');

			const requests = [];
			if (anafRouteExists) {
				requests.push(axios.get(route('dashboard.stats.anaf')));
			} else {
				console.warn('Route dashboard.stats.anaf not found.');
				requests.push(Promise.resolve({ data: { recentSearches: [], searchCount: 0 } })); // Default data
			}

			if (seapRouteExists) {
				requests.push(axios.get(route('dashboard.stats.seap')));
			} else {
				console.warn('Route dashboard.stats.seap not found.');
				requests.push(Promise.resolve({ data: { totalSumLastMonth: '0,00', period: 'N/A' } })); // Default data
			}

			const [anafRes, seapRes] = await Promise.all(requests);

			setAnafStats(anafRes.data);
			
			// Parse the numeric value for animation
			const rawValue = seapRes.data.totalSumLastMonth.replace(/\./g, '').replace(',', '.');
			const numericValue = parseFloat(rawValue) || 0;
			
			setSeapStats({
                ...seapRes.data,
                asNumber: numericValue
            });
			
			// Trigger animation by incrementing the trigger value
			setAnimationTrigger(prev => prev + 1);
			
			setLastRefreshed(new Date());
		} catch (error) {
			console.error("Error fetching dashboard stats:", error);
			// Set default/error state if needed
			setAnafStats({ recentSearches: [], searchCount: 0 });
			setSeapStats({ 
                totalSumLastMonth: 'Eroare', 
                period: '', 
                asNumber: 0,
                transactionCount: 0 
            });
		} finally {
			setLoadingStats(false);
		}
	};

	// Fetch stats on component mount and add visibility change listener
	useEffect(() => {
		fetchStats(); // Initial fetch

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				fetchStats(); // Refetch when tab becomes visible
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		// Cleanup listener on component unmount
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, []); // Empty dependency array means this runs once on mount

	// Add periodic refresh every 60 seconds
	useEffect(() => {
		const interval = setInterval(() => {
			fetchStats();
		}, 60000); // 60 seconds

		return () => clearInterval(interval);
	}, []);

	return (
		<AuthenticatedLayout
			header={
				<h2 className="text-xl font-semibold leading-tight text-gray-800">
					Dashboard
				</h2>
			}
		>
			<Head title="Dashboard" />

			<div className="py-12">
				<div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
					<div className="overflow-hidden bg-white shadow-sm sm:rounded-lg p-6">
						{/* Welcome Message */}
						<h3 className="text-xl font-semibold text-gray-800 mb-6">
							Bun venit, {auth.user.name}!
						</h3>

						{/* Statistics Section with Refresh Button */}
						<div className="mb-8">
							<div className="flex justify-between items-center mb-4">
								<h4 className="text-lg font-semibold text-gray-700">Statistici Rapide</h4>
								<div>
									<button 
										onClick={fetchStats} 
										disabled={loadingStats}
										className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
									>
										{loadingStats ? (
											<>
												<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
												Actualizare...
											</>
										) : (
											<>
												<svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
												</svg>
												Actualizează
											</>
										)}
									</button>
								</div>
							</div>
							<p className="text-xs text-gray-400 mb-4">
								Ultima actualizare: {lastRefreshed.toLocaleTimeString()}
							</p>
							
							{loadingStats ? (
								<div className="text-center text-gray-500">Se încarcă statisticile...</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									{/* ANAF Search Count */}
									<div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
										<h5 className="text-sm font-medium text-gray-500">Căutări ANAF</h5>
										<p className="mt-1 text-2xl font-semibold text-gray-900">
                                            <CountUpAnimation end={anafStats.searchCount} duration={1000} key={`anaf-${animationTrigger}`} />
                                        </p>
									</div>
									{/* Recent ANAF Searches */}
									<div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
										<h5 className="text-sm font-medium text-gray-500">Ultimele Căutări ANAF</h5>
										{anafStats.recentSearches && anafStats.recentSearches.length > 0 ? (
											<ul className="mt-1 space-y-1 text-sm text-gray-700 max-h-24 overflow-y-auto"> {/* Added scroll */}
												{anafStats.recentSearches.slice(0).reverse().map((cui, index) => ( // Reverse to show newest first
													<li key={index}>
														<Link href={`/company-search?cui=${cui}`} className="hover:underline text-blue-600">{cui}</Link>
													</li>
												))}
											</ul>
										) : (
											<p className="mt-1 text-sm text-gray-500">Nicio căutare recentă.</p>
										)}
									</div>
									{/* SEAP Sum with Animation */}
									<div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
										<h5 className="text-sm font-medium text-gray-500">Sumă Tranzacționată SEAP ({seapStats.period})</h5>
										<p className="mt-1 text-2xl font-semibold text-gray-900">
                                            <CountUpAnimation 
                                                end={seapStats.asNumber} 
                                                duration={1500}
                                                decimals={2} 
                                                suffix=" RON"
                                                key={`seap-${animationTrigger}`} 
                                            />
                                        </p>
                                        {seapStats.transactionCount > 0 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Din {seapStats.transactionCount} tranzacții
                                            </p>
                                        )}
									</div>
								</div>
							)}
						</div>

						{/* Navigation Links Section */}
						<div>
							<h4 className="text-lg font-semibold text-gray-700 mb-4">Navigare</h4>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<Link
									href={route('seap')}
									className="block p-6 bg-blue-50 hover:bg-blue-100 rounded-lg shadow transition"
								>
									<h3 className="text-lg font-medium text-blue-700">SEAP</h3>
									<p className="mt-2 text-sm text-blue-600">
										Vezi datele din fișiere CSV și rapoarte.
									</p>
								</Link>

								<Link
									href={route('company.search')}
									className="block p-6 bg-green-50 hover:bg-green-100 rounded-lg shadow transition"
								>
									<h3 className="text-lg font-medium text-green-700">Căutare ANAF</h3>
									<p className="mt-2 text-sm text-green-600">
										Verifică informații firme după CUI.
									</p>
								</Link>

								<Link
									href={route('profile.edit')}
									className="block p-6 bg-yellow-50 hover:bg-yellow-100 rounded-lg shadow transition"
								>
									<h3 className="text-lg font-medium text-yellow-700">Profil</h3>
									<p className="mt-2 text-sm text-yellow-600">
										Actualizează-ți datele de utilizator și parola.
									</p>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
