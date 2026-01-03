---
title: Why your flights are delayed
date: 2026-01-03
excerpt: Inspired by a friend's constant flight delays, I speak about what causes them, how this impacts you and your baggage, and what you should do if your flight is delayed.
category: Engineering
tags:
  - flights
  - airport
  - delays
image: /img/blog/bao-menglong--FhoJYnw-cg-unsplash.jpg
author: Hasha Dar
ai-generated-content: false
---
Inspired by my friend AA's constant flight delays, this article will explore how and why flights are delayed. I will also try to provide some advice for their future journeys. I hope this article serves as a useful explainer on some of the complexities of air travel and how small events can turn into big headaches for a lot of people!
# What is a delay?
## The 15-minute buffer
When you look at your plane ticket, the departure time is often listed in 5 minute blocks e.g. 15:35 or 17:00. This is called the **Scheduled Time of Departure (STD)**. The **Actual Time of Departure (ATD)** is also recorded by operational systems and the variance between these is used to calculate the delay experienced by an aircraft. From an analytics perspective, if the ATD is more than 15 minutes after the STD, the flight is considered to have a late departure. Its also important to note that the exact moment of ATD is when the aircraft pushes back from the gate. 

The reason we have a 15 minutes buffer is to account for random issues with loading passengers and baggage onto the plane. Other things may also take a bit of extra time such as conducting checks and performing administrative due diligence. We wouldn't want to record a flight as late just because it was 5 minutes late - the goal is to record *statistically significant* delays.

So does this mean that aircraft are delayed because something happens between STD and ATD? This is actually the wrong question to ask, as aircraft operate from an airport, which is a stochastic queuing network with tightly coupled dependencies. We must look first at the environment that aircraft operate in and investigate at all the steps an aircraft must take before its ready to pushback from the gate at its listed STD. These steps serve to highlight *failure points* that could lead to a delay.
# Lets get on my flight!
## Where is my plane??
To get on your flight, a very important pre-requisite is that the plane is actually there at the airport. Lets take a look at why a flight may have issues getting to an airport. 

Airports can only have so many planes land per hour. When demand (incoming flights) exceeds the capacity rate (due to volume or weather or other factors), **Air Traffic Control (ATC)** can't ask planes to stop mid-air and have a cup of tea. ATC instead build queues. The way they work is: 
1. A plane enters the "holding stack", you typically experience this as the plane flying a holding pattern - an oval loop near the airport. They wait for clearance to enter the next step here. 
2. Planes enter the "Ladder" at the top (e.g. 10,000 feet), as the last plane in the ladder lands, aircraft are permitted to move down and await landing clearance. The last steps of the ladder are typically called "final approach". 
The limit here is fuel. If the expected hold time exceeds the aircraft's remaining reserve fuel, the aircraft must divert. This type of delay typically affects an aircraft's landing time and as we will say later, this can have significant knock-on effects.

When the plane touches down on the runway, a certain amount of time is occupied by the aircraft before it moves off onto the taxiway. ATC requires the runway to be physically clear before the next plane can land. If a plane misses its taxiway exit or brakes too slowly, the spacing in the ladder is violated. The next plane to land must perform a **Go-Around** (abort landing) and re-enter the queue, causing a significant delay for that aircraft. 

Possibly the most frustrating type of delay is called **Gate Starvation**. This scenario involves an aircraft assigned a gate (e.g. Gate A12) but the plane currently at A12 for one reason or another has not pushed back out of the gate. Unlike a car in a carpark, aircraft physically cannot just reverse and go to another gate. An aircraft must go to its assigned gate as there are physical, logistical and human constraints e.g. other gates may not be able to accommodate the aircraft, the ground crews cannot easily move to the other gate, the passengers are already waiting at the assigned gate. Hence, the aircraft must wait for the gate clear. This causes other issues as the apron taxiways are usually one-way, and the waiting aircraft may block another plane trying to leave e.g. a plane waiting to pushback at A11 or block an aircraft trying to get to A13.

## My planes at the gate...
The time between an aircraft stopping at the gate **(Block On)** and pushing back **(Pushback)** from the gate is called the **Turnaround Time (TAT)**. Operationally, airlines want to minimise the TAT spent by aircraft as this is dead time - the plane is not flying and generating revenue. 

The aircraft rolls to a stop and ground crew chocks the wheels, the engines power down and other mechanical gubbins are connected to the aircraft for power and air. Once this has occurred, multiple things are happening onboard and on the ground to get the plane ready for its next flight. Passengers are deplaned, either through a jetway or through airstairs and transported to the gate by foot or by bus. Baggage and cargo is also removed. The aircraft is refuelled, onboard water replenished, and waste removed. Catering trucks restock the onboard supplies. Cleaning crews and security sweep the cabin to make sure everything is neat and tidy for the next set of passengers and to make sure nothing (or no-one!) is left behind. 

Before the plane can fly again, the aircraft needs a 360-degree exterior inspection. Engineers are looking for Foreign Object Debris (FOD) damage to tyres or engines, fluid leaks (hydraulics and fuel systems) and checking sensor integrity. Any problems here can cause a delay, or worse - ground an aircraft until the problem is fixed. 

Once the above are completed, passengers and baggage can begin boarding. Delays can occur here for multiple reasons: late check-ins, people spending too much time at duty-free, complex cargo logistics. After boarding complete, the pilot receives a "Load Sheet" that confirms that the aircraft Centre of Gravity is within limits for take-off. Once this is signed, and the head flight attendant confirms "Cabin Secure", the doors are closed and the aircraft send an ACARS (digital data link) message to the airline's operations centre. From that moment, the aircraft is legally and technically ready for the tug to push it back.

These complex logistics serve as failure points in the critical path between Block On and Pushback. A delay in offloading cargo, or a failure to refuel the aircraft due to leaks, or a missing passenger can increase the amount of time spent by an aircraft on the ground, pushing ATD past the STD.
# The ripple effect
## How did I reach but my bag didn't?
Airports have very complex **Baggage Handling Systems (BHS)**. Consider it like an automated factory, which operates on strict time windows. It has to consider a plethora of scenarios when handling a single piece of luggage and treat them accordingly. The BHS is a sorting network that must balance capacity against time. A typical BHS operates like this: 
- **The Early Bag Store (EBS):** If you check a bag in 10 hours early, it cannot go to the gate immediately as there is no plane there. It is routed to the EBS - a robotic warehousing grid - where it is stored until the flight opens.
- **The Sortation Window:** As the STD approaches, the BHS "wakes up" the bag and injects it into the high-speed tray system. At a pre-defined time (usually 40-60 minutes before departure), the system "closes" the flight. Any bag injected after this cut-off is automatically rejected to a different lane because the system calculates it physically cannot reach the gate in time.

During stop-overs, a captain must make a critical decision: if its between waiting 10 minutes for transfer bags to arrive or missing a 15-minute departure slot, the captain will order the doors closed, and the bags are sacrificed to save the schedule for the passengers and the network. This is called "short-shipping" the bags. If a flight is cancelled *after* loading, getting bags off is harder than putting them on. The system is designed for one-way flow and reversing the process requires a lot of manual labour, consuming valuable hours. 

Failure to retrieve the bag in time from the EBS or checking in a piece of luggage in time, means it misses the flight and isn't loaded. These bags must find another way to their destination, which is another whole problem. Airlines typically try to put the bag on their next flight, if that's not possible, they must pay another airline to take them to their destination. The BHS automatically prints a "RUSH" tag for these bags so that they receive expedited handling. 
## The human baggage
Lets talk about a specific scenario here. You have a connecting flight and the first leg is delayed. This cuts your connection time down to 50 minutes. The **Minimum Connection Time (MCT)** at an airport like Dubai International or Heathrow is around 60-90 minutes, depending on the departure terminal of your next flight. Since your flight has landed outside of the MCT, the system might automatically cancel your next leg before you even land, because you statistically *cannot* make the baggage transfer and security screening. Technically speaking, this automatic cancellation can be bypassed if you decide to "self-connect", where you buy the two legs individually, instead of purchasing a through ticket. However, you would be liable for the risk of missing the second leg, instead of the airline. 

Another scenario is that the flight is *listed* as on time online but you get to the gate and you see a queue of people waiting to board as the flight is delayed. Airports and airlines still use a lot of legacy systems for bookings, managing flights and aircraft. Data moving through legacy mainframes (ACARS -> Airline Operations -> Airport Database -> Flight Information Display System/Online), experiences latency and providing passengers with the most up-to-date information immediately is an issue for airlines. 
## So much can go wrong!?
In safety engineering, the "Swiss Cheese Model" explains that accidents happen when holes in different layers of defence align. Imagine the aircraft was stuck in a holding pattern for half an hour, had to wait for the gate to clear, engineers found an small issue with one of the engines, and the airport had a shortage of baggage handlers! This could result in that flight being significantly delayed or even worse: *cancelled* - holiday ruined.

Individually these are minor variances but together they create a system failure - the flight has been unable to take-off on-time. As a passenger, we can't control the cheese (the system) or the holes in the cheese (the failure points), but we can control our exposure to the risk. 
# Engineering your way
In this section, we will look at some tips and tricks I use all the time to make sure I am aware of what's going on with my flight. The more information I have, the more calm I feel when taking flights. It helps me relax a lot more knowing where my plane is and when to board. 
## Strategic scheduling
Although typically not in our control, and the actual effectiveness dependent on the airport/airline itself, booking flights at a certain time can help mitigate a potential delay. For example, at Heathrow, the first flights start operating at 6am, as the airport is closed during the night hours. This means that these flights will have a much lesser risk of delay then flights at 6pm, as these flights may experience ripple effects. Hence, booking early can minimise risk - at the cost of your sleep!

Every connection adds a node to the "network" of your flight, and each node has a failure probability - the plane needs to land and take-off and that dance can have a lot of risk. Simply speaking, a direct flight has one chance to fail, whereas a connecting flight has 3: Flight A, the transfer process and Flight B. Minimising nodes minimises risk.

Although we can't control the weather, we can be aware of the risks when booking in certain seasons. Summer is usually busy season, and a lot of flights in the air means that the airspace can become oversaturated, volume being the constraint here. In winter, weather is usually the constraint. Heavy rain, fog and mist can cause delayed take-offs or aborted landings. Icy conditions may require aircraft de-icing and valuable time. A solid weather app can give you insight on the conditions your aircraft may face!
## Data downlinks
I only look at the departure board once - to confirm the gate for my flight. My main data feed at the airport is an app called [Flighty](https://flighty.com/). This gives me all the information I need to help me get onto my flight:
- The exact aircraft I am flying on - tail number, aircraft type and age, where the aircraft is (in the air or on the ground)
- Weather information
- Airport information - average real-time take-off delay times, gate information, transfer times
- Historical information on the lateness of this particular flight and other statistics
Flighty also has a very useful live activity feature on iOS, which gives me the most important timing information right on my lock screen. I use this all the time when picking up people from the airport, so that I can leave the house at an appropriate time.

FlightRadar24 is also a good option if you want similar information to the above - however I don't think the information is as cleanly presented as it is on Flighty.
## Reaction protocols
If your flight is cancelled, 200 people are trying to compete for five spots on the next flight. Queuing up and trying your luck at the counter is a slow way to get what you want. I usually call the airline immediately - I am accessing the same inventory of seats but getting to the front of the line much more quickly. Airlines operate on cost functions, they owe you compensation for delays and you become a *high-cost* problem they want to solve as quickly as possible with minimal fuss. Know your rights and read the fine print to better leverage your advantage! 
# Final words
I hope this has been a useful explainer, I have thoroughly enjoyed researching this topic. The mechanical engineer in me has definitely been a part of this world for quite a bit of time but it has been especially useful for me thinking about and writing on the topic. Although I prefer to watch video documentaries on YouTube for this sort of thing, there is a certain joy and calm in doing it for yourself. I will definitely be doing a few more of these on the future! 

---

**Image credit:** Featured image by [Bao Menglong](https://unsplash.com/@__menglong).